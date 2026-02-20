use crate::database::get_current_store_id;
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
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesReport {
    pub kpis: ReportKpis,
    pub sales_chart: Vec<ChartDataPoint>,
    pub category_chart: Vec<CategoryDataPoint>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TopSellingProduct {
    pub ranking: i64,
    pub product_name: String,
    pub product_code: String,
    pub category_name: String,
    pub category_color: Option<String>,
    pub quantity_sold: f64,
    pub total_revenue: f64,
    pub percentage_of_total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeadStockProduct {
    pub product_name: String,
    pub product_code: String,
    pub category_name: String,
    pub category_color: Option<String>,
    pub current_stock: i64,
    pub purchase_price: f64,
    pub stagnant_value: f64,
    pub last_sale_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CatalogReport {
    pub top_sellers: Vec<TopSellingProduct>,
    pub dead_stock: Vec<DeadStockProduct>,
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
            2) as percentage,
            color
        FROM (
            SELECT 
                c.name as category_name,
                COALESCE(SUM(si.total), 0.0) as category_total,
                c.color
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE s.created_at BETWEEN ?1 AND ?2 
              AND s.status = 'completed'
            GROUP BY c.id, c.name, c.color
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
                color: row.get(3)?,
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

#[tauri::command]
pub fn get_top_selling_products(
    db: State<Mutex<Connection>>,
    from_date: String,
    to_date: String,
    limit: Option<i64>,
    category_ids: Option<Vec<String>>,
) -> Result<Vec<TopSellingProduct>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let seller_limit = limit.unwrap_or(50);

    let category_filter = match &category_ids {
        Some(ids) if !ids.is_empty() => {
            let placeholders: Vec<String> = ids
                .iter()
                .enumerate()
                .map(|(i, _)| format!("?{}", i + 4))
                .collect();
            format!("AND ps.category_id IN ({})", placeholders.join(", "))
        }
        _ => String::new(),
    };

    let sql = format!(
        r#"
        WITH product_sales AS (
            SELECT 
                si.product_id,
                p.category_id,
                p.name as product_name,
                p.code as product_code,
                COALESCE(c.name, 'Sin Categoría') as category_name,
                c.color as category_color,
                SUM(si.quantity) as quantity_sold,
                SUM(si.total) as total_revenue
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE s.created_at BETWEEN ?1 AND ?2
              AND s.status != 'cancelled'
            GROUP BY si.product_id, p.category_id, p.name, p.code, c.name, c.color
        ),
        grand_total AS (
            SELECT COALESCE(SUM(total_revenue), 0.0) as total FROM product_sales
        )
        SELECT 
            ROW_NUMBER() OVER (ORDER BY ps.total_revenue DESC) as ranking,
            ps.product_name,
            ps.product_code,
            ps.category_name,
            ps.category_color,
            ps.quantity_sold,
            ps.total_revenue,
            CASE 
                WHEN gt.total > 0 THEN ROUND((ps.total_revenue * 100.0 / gt.total), 2)
                ELSE 0.0
            END as percentage_of_total
        FROM product_sales ps, grand_total gt
        WHERE 1=1
          {}
        ORDER BY ps.total_revenue DESC
        LIMIT ?3
    "#,
        category_filter
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let mut bind_params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(from_date),
        Box::new(to_date),
        Box::new(seller_limit),
    ];
    if let Some(ids) = &category_ids {
        for id in ids {
            bind_params.push(Box::new(id.clone()));
        }
    }

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        bind_params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(TopSellingProduct {
                ranking: row.get(0)?,
                product_name: row.get(1)?,
                product_code: row.get(2)?,
                category_name: row.get(3)?,
                category_color: row.get(4)?,
                quantity_sold: row.get(5)?,
                total_revenue: row.get(6)?,
                percentage_of_total: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_dead_stock_report(
    db: State<Mutex<Connection>>,
    from_date: String,
    to_date: String,
    category_ids: Option<Vec<String>>,
) -> Result<Vec<DeadStockProduct>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let store_id = get_current_store_id(&conn)?;

    let category_filter = match &category_ids {
        Some(ids) if !ids.is_empty() => {
            let placeholders: Vec<String> = ids
                .iter()
                .enumerate()
                .map(|(i, _)| format!("?{}", i + 4))
                .collect();
            format!("AND p.category_id IN ({})", placeholders.join(", "))
        }
        _ => String::new(),
    };

    let sql = format!(
        r#"
        SELECT 
            p.name as product_name,
            p.code as product_code,
            COALESCE(c.name, 'Sin Categoría') as category_name,
            c.color as category_color,
            inv.stock as current_stock,
            COALESCE(p.purchase_price, 0.0) as purchase_price,
            ROUND(inv.stock * COALESCE(p.purchase_price, 0.0), 2) as stagnant_value,
            (
                SELECT MAX(s2.created_at)
                FROM sale_items si2
                JOIN sales s2 ON si2.sale_id = s2.id
                WHERE si2.product_id = p.id
                  AND s2.status != 'cancelled'
            ) as last_sale_date
        FROM products p
        JOIN store_inventory inv ON p.id = inv.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE inv.store_id = ?3
          AND inv.stock > 0
          AND p.is_active = 1
          AND p.deleted_at IS NULL
          AND p.id NOT IN (
              SELECT DISTINCT si.product_id
              FROM sale_items si
              JOIN sales s ON si.sale_id = s.id
              WHERE s.created_at BETWEEN ?1 AND ?2
                AND s.status != 'cancelled'
          )
          {}
        ORDER BY stagnant_value DESC
    "#,
        category_filter
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let mut bind_params: Vec<Box<dyn rusqlite::types::ToSql>> =
        vec![Box::new(from_date), Box::new(to_date), Box::new(store_id)];
    if let Some(ids) = &category_ids {
        for id in ids {
            bind_params.push(Box::new(id.clone()));
        }
    }

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        bind_params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(DeadStockProduct {
                product_name: row.get(0)?,
                product_code: row.get(1)?,
                category_name: row.get(2)?,
                category_color: row.get(3)?,
                current_stock: row.get(4)?,
                purchase_price: row.get(5)?,
                stagnant_value: row.get(6)?,
                last_sale_date: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}
