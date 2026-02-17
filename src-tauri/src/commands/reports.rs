use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ReportKpis {
    pub gross_sales: f64,
    pub net_profit: f64,
    pub transaction_count: i64,
    pub average_ticket: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChartDataPoint {
    pub day: String,
    pub total_sales: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryDataPoint {
    pub category_name: String,
    pub total_sales: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesReport {
    pub kpis: ReportKpis,
    pub sales_chart: Vec<ChartDataPoint>,
    pub category_chart: Vec<CategoryDataPoint>,
}

fn fetch_kpis(conn: &Connection, from_date: &str, to_date: &str) -> Result<ReportKpis, String> {
    let sql = r#"
        SELECT 
            COALESCE(SUM(s.total), 0.0) as gross_sales,
            COUNT(s.id) as transaction_count,
            COALESCE((
                SELECT SUM(si.total - (si.quantity * COALESCE(p.purchase_price, 0)))
                FROM sale_items si
                JOIN sales s2 ON si.sale_id = s2.id
                JOIN products p ON si.product_id = p.id
                WHERE s2.created_at BETWEEN ?1 AND ?2 
                  AND s2.status = 'completed'
            ), 0.0) as net_profit
        FROM sales s
        WHERE s.created_at BETWEEN ?1 AND ?2 
          AND s.status = 'completed'
    "#;

    conn.query_row(sql, params![from_date, to_date], |row| {
        let gross_sales: f64 = row.get(0)?;
        let transaction_count: i64 = row.get(1)?;
        let net_profit: f64 = row.get(2)?;
        let average_ticket = if transaction_count > 0 {
            gross_sales / transaction_count as f64
        } else {
            0.0
        };

        Ok(ReportKpis {
            gross_sales,
            net_profit,
            transaction_count,
            average_ticket,
        })
    })
    .map_err(|e| e.to_string())
}

fn fetch_sales_chart(
    conn: &Connection,
    from_date: &str,
    to_date: &str,
) -> Result<Vec<ChartDataPoint>, String> {
    let sql = r#"
        WITH RECURSIVE date_series(day) AS (
            SELECT ?1
            UNION ALL
            SELECT date(day, '+1 day')
            FROM date_series
            WHERE day < ?2
        ),
        daily_sales AS (
            SELECT 
                strftime('%Y-%m-%d', created_at, 'localtime') as sale_day, 
                COALESCE(SUM(total), 0.0) as total_sales
            FROM sales 
            WHERE created_at BETWEEN ?1 AND ?2 
              AND status = 'completed'
            GROUP BY sale_day
        )
        SELECT 
            ds.day,
            COALESCE(d.total_sales, 0.0) as total_sales
        FROM date_series ds
        LEFT JOIN daily_sales d ON ds.day = d.sale_day
        ORDER BY ds.day ASC
    "#;

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![from_date, to_date], |row| {
            Ok(ChartDataPoint {
                day: row.get(0)?,
                total_sales: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn fetch_categories(
    conn: &Connection,
    from_date: &str,
    to_date: &str,
) -> Result<Vec<CategoryDataPoint>, String> {
    let sql = r#"
        SELECT 
            category_name,
            category_total,
            ROUND(
                CASE 
                    WHEN SUM(category_total) OVER() > 0 
                    THEN (category_total * 100.0 / SUM(category_total) OVER())
                    ELSE 0.0
                END,
            2) as percentage
        FROM (
            SELECT 
                c.name as category_name,
                COALESCE(SUM(si.total), 0.0) as category_total
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE s.created_at BETWEEN ?1 AND ?2 
              AND s.status = 'completed'
            GROUP BY c.id, c.name
        )
        ORDER BY category_total DESC
    "#;

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![from_date, to_date], |row| {
            Ok(CategoryDataPoint {
                category_name: row.get(0)?,
                total_sales: row.get(1)?,
                percentage: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_sales_report(
    db: State<Mutex<Connection>>,
    from_date: String,
    to_date: String,
) -> Result<SalesReport, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let kpis = fetch_kpis(&conn, &from_date, &to_date)?;
    let sales_chart = fetch_sales_chart(&conn, &from_date, &to_date)?;
    let category_chart = fetch_categories(&conn, &from_date, &to_date)?;

    Ok(SalesReport {
        kpis,
        sales_chart,
        category_chart,
    })
}
