use crate::database::init_database;
use rusqlite::{params, Result};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

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

#[tauri::command]
pub fn get_sales_report_kpis(
    app_handle: AppHandle,
    from_date: String,
    to_date: String,
) -> Result<ReportKpis, String> {
    let conn = init_database(&app_handle).map_err(|e| e.to_string())?;

    let kpi_query = r#"
        SELECT 
            COALESCE(SUM(total), 0.0) as gross_sales,
            COUNT(id) as transaction_count
        FROM sales 
        WHERE created_at BETWEEN ?1 AND ?2 
          AND status = 'completed'
    "#;

    let (gross_sales, transaction_count): (f64, i64) = conn
        .query_row(kpi_query, params![from_date, to_date], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .map_err(|e| e.to_string())?;

    let profit_query = r#"
        SELECT 
            COALESCE(SUM(si.total - (si.quantity * COALESCE(p.purchase_price, 0))), 0.0) as estimated_profit
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        WHERE s.created_at BETWEEN ?1 AND ?2 
          AND s.status = 'completed'
    "#;

    let net_profit: f64 = conn
        .query_row(profit_query, params![from_date, to_date], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;

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
}

#[tauri::command]
pub fn get_sales_chart_data(
    app_handle: AppHandle,
    from_date: String,
    to_date: String,
) -> Result<Vec<ChartDataPoint>, String> {
    let conn = init_database(&app_handle).map_err(|e| e.to_string())?;

    let sql = r#"
        SELECT 
            strftime('%Y-%m-%d', created_at, 'localtime') as day, 
            COALESCE(SUM(total), 0.0) as total_sales
        FROM sales 
        WHERE created_at BETWEEN ?1 AND ?2 
          AND status = 'completed'
        GROUP BY day 
        ORDER BY day ASC;
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

    let mut data = Vec::new();
    for row in rows {
        data.push(row.map_err(|e| e.to_string())?);
    }

    Ok(data)
}

#[tauri::command]
pub fn get_sales_by_category(
    app_handle: AppHandle,
    from_date: String,
    to_date: String,
) -> Result<Vec<CategoryDataPoint>, String> {
    let conn = init_database(&app_handle).map_err(|e| e.to_string())?;

    let total_period_sales: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total), 0) FROM sales WHERE created_at BETWEEN ?1 AND ?2 AND status = 'completed'",
        params![from_date, to_date],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let sql = r#"
        SELECT 
            c.name as category_name,
            COALESCE(SUM(si.total), 0.0) as category_total
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE s.created_at BETWEEN ?1 AND ?2 
          AND s.status = 'completed'
        GROUP BY c.id
        ORDER BY category_total DESC
    "#;

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![from_date, to_date], |row| {
            let category_total: f64 = row.get(1)?;
            let percentage = if total_period_sales > 0.0 {
                (category_total / total_period_sales) * 100.0
            } else {
                0.0
            };

            Ok(CategoryDataPoint {
                category_name: row.get(0)?,
                total_sales: category_total,
                percentage: (percentage * 100.0).round() / 100.0, 
            })
        })
        .map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for row in rows {
        data.push(row.map_err(|e| e.to_string())?);
    }

    Ok(data)
}
