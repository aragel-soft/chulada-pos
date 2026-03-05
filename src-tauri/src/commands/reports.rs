use crate::database::get_current_store_id;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct PaginatedResult<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

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
    pub category_id: String,
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
    pub category_id: String,
    pub category_name: String,
    pub category_color: Option<String>,
    pub current_stock: i64,
    pub purchase_price: f64,
    pub stagnant_value: f64,
    pub last_sale_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryValuation {
    pub total_cost: f64,
    pub total_retail: f64,
    pub projected_profit: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LowStockProduct {
    pub product_name: String,
    pub product_code: String,
    pub category_id: String,
    pub category_name: String,
    pub category_color: Option<String>,
    pub current_stock: i64,
    pub minimum_stock: i64,
    pub suggested_order: i64,
    pub purchase_price: f64,
    pub retail_price: f64,
}

fn fetch_kpis(conn: &Connection, from_date: &str, to_date: &str) -> Result<ReportKpis, String> {
    let sql = r#"
        SELECT 
            COALESCE(SUM(
                si.total - COALESCE(ri.returned_subtotal, 0.0)
            ), 0.0) as gross_sales,
            COUNT(DISTINCT s.id) as transaction_count,
            COALESCE(SUM(
                (si.total - COALESCE(ri.returned_subtotal, 0.0))
                - ((si.quantity - COALESCE(ri.returned_qty, 0.0)) * COALESCE(p.purchase_price, 0))
            ), 0.0) as net_profit
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        LEFT JOIN (
            SELECT sale_item_id, SUM(quantity) as returned_qty, SUM(subtotal) as returned_subtotal
            FROM return_items
            GROUP BY sale_item_id
        ) ri ON ri.sale_item_id = si.id
        WHERE s.created_at BETWEEN ?1 AND ?2 
          AND s.status IN ('completed', 'partial_return')
          AND (si.quantity - COALESCE(ri.returned_qty, 0.0)) > 0.001
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
                strftime('%Y-%m-%d', s.created_at, 'localtime') as sale_day, 
                COALESCE(SUM(
                    si.total - COALESCE(ri.returned_subtotal, 0.0)
                ), 0.0) as total_sales
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            LEFT JOIN (
                SELECT sale_item_id, SUM(quantity) as returned_qty, SUM(subtotal) as returned_subtotal
                FROM return_items
                GROUP BY sale_item_id
            ) ri ON ri.sale_item_id = si.id
            WHERE s.created_at BETWEEN ?1 AND ?2 
              AND s.status IN ('completed', 'partial_return')
              AND (si.quantity - COALESCE(ri.returned_qty, 0.0)) > 0.001
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
                COALESCE(SUM(
                    si.total - COALESCE(ri.returned_subtotal, 0.0)
                ), 0.0) as category_total,
                c.color
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            LEFT JOIN (
                SELECT sale_item_id, SUM(quantity) as returned_qty, SUM(subtotal) as returned_subtotal
                FROM return_items
                GROUP BY sale_item_id
            ) ri ON ri.sale_item_id = si.id
            WHERE s.created_at BETWEEN ?1 AND ?2 
              AND s.status IN ('completed', 'partial_return')
              AND (si.quantity - COALESCE(ri.returned_qty, 0.0)) > 0.001
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
    page: i64,
    page_size: i64,
    category_ids: Option<Vec<String>>,
    sort_by: Option<String>,
    sort_order: Option<String>,
) -> Result<PaginatedResult<TopSellingProduct>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let offset = (page - 1) * page_size;

    let category_filter_count = match &category_ids {
        Some(ids) if !ids.is_empty() => {
            let placeholders: Vec<String> = ids
                .iter()
                .enumerate()
                .map(|(i, _)| format!("?{}", i + 3))
                .collect();
            format!("AND ps.category_id IN ({})", placeholders.join(", "))
        }
        _ => String::new(),
    };

    let category_filter_data = match &category_ids {
        Some(ids) if !ids.is_empty() => {
            let placeholders: Vec<String> = ids
                .iter()
                .enumerate()
                .map(|(i, _)| format!("?{}", i + 5))
                .collect();
            format!("AND ps.category_id IN ({})", placeholders.join(", "))
        }
        _ => String::new(),
    };

    let count_sql = format!(
        r#"
        WITH product_sales AS (
            SELECT 
                si.product_id,
                p.category_id
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN (
                SELECT sale_item_id, SUM(quantity) as returned_qty
                FROM return_items
                GROUP BY sale_item_id
            ) ri ON ri.sale_item_id = si.id
            WHERE s.created_at BETWEEN ?1 AND ?2
              AND s.status IN ('completed', 'partial_return')
              AND (si.quantity - COALESCE(ri.returned_qty, 0.0)) > 0.001
            GROUP BY si.product_id, p.category_id
        )
        SELECT COUNT(*) FROM product_sales ps
        WHERE 1=1 {}
        "#,
        category_filter_count
    );

    let mut count_params: Vec<Box<dyn rusqlite::types::ToSql>> =
        vec![Box::new(from_date.clone()), Box::new(to_date.clone())];

    if let Some(ids) = &category_ids {
        for id in ids {
            count_params.push(Box::new(id.clone()));
        }
    }

    let count_params_refs: Vec<&dyn rusqlite::types::ToSql> =
        count_params.iter().map(|p| p.as_ref()).collect();

    let total_count: i64 = conn
        .query_row(&count_sql, count_params_refs.as_slice(), |row| row.get(0))
        .unwrap_or(0);

    let data_sql = format!(
        r#"
        WITH product_sales AS (
            SELECT 
                si.product_id,
                p.category_id,
                p.name as product_name,
                p.code as product_code,
                COALESCE(c.name, 'Sin Categoría') as category_name,
                c.color as category_color,
                SUM(si.quantity - COALESCE(ri.returned_qty, 0.0)) as quantity_sold,
                SUM(si.total - COALESCE(ri.returned_subtotal, 0.0)) as total_revenue
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN (
                SELECT sale_item_id, SUM(quantity) as returned_qty, SUM(subtotal) as returned_subtotal
                FROM return_items
                GROUP BY sale_item_id
            ) ri ON ri.sale_item_id = si.id
            WHERE s.created_at BETWEEN ?1 AND ?2
              AND s.status IN ('completed', 'partial_return')
              AND (si.quantity - COALESCE(ri.returned_qty, 0.0)) > 0.001
            GROUP BY si.product_id, p.category_id, p.name, p.code, c.name, c.color
        ),
        grand_total AS (
            SELECT COALESCE(SUM(total_revenue), 0.0) as total FROM product_sales
        )
        SELECT 
            ROW_NUMBER() OVER (ORDER BY ps.total_revenue DESC) as ranking,
            ps.product_name,
            ps.product_code,
            ps.category_id,
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
        ORDER BY {} {}
        LIMIT ?3 OFFSET ?4
    "#,
        category_filter_data,
        match sort_by.as_deref() {
            Some("product_name") => "ps.product_name",
            Some("category_name") => "ps.category_name",
            Some("quantity_sold") => "ps.quantity_sold",
            Some("percentage_of_total") => "percentage_of_total",
            _ => "ps.total_revenue",
        },
        match sort_order.as_deref() {
            Some("desc") => "DESC",
            Some("asc") => "ASC",
            _ =>
                if sort_by.is_none() {
                    "DESC"
                } else {
                    "ASC"
                },
        }
    );

    let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;

    let mut data_params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(from_date),
        Box::new(to_date),
        Box::new(page_size),
        Box::new(offset),
    ];

    if let Some(ids) = &category_ids {
        for id in ids {
            data_params.push(Box::new(id.clone()));
        }
    }

    let data_params_refs: Vec<&dyn rusqlite::types::ToSql> =
        data_params.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(data_params_refs.as_slice(), |row| {
            Ok(TopSellingProduct {
                ranking: row.get(0)?,
                product_name: row.get(1)?,
                product_code: row.get(2)?,
                category_id: row.get(3)?,
                category_name: row.get(4)?,
                category_color: row.get(5)?,
                quantity_sold: row.get(6)?,
                total_revenue: row.get(7)?,
                percentage_of_total: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let data = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    let total_pages = (total_count as f64 / page_size as f64).ceil() as i64;

    Ok(PaginatedResult {
        data,
        total: total_count,
        page,
        page_size,
        total_pages,
    })
}

#[tauri::command]
pub fn get_dead_stock_report(
    db: State<Mutex<Connection>>,
    from_date: String,
    to_date: String,
    page: i64,
    page_size: i64,
    category_ids: Option<Vec<String>>,
    sort_by: Option<String>,
    sort_order: Option<String>,
) -> Result<PaginatedResult<DeadStockProduct>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let store_id = get_current_store_id(&conn)?;

    let offset = (page - 1) * page_size;

    let category_filter_count = match &category_ids {
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

    let category_filter_data = match &category_ids {
        Some(ids) if !ids.is_empty() => {
            let placeholders: Vec<String> = ids
                .iter()
                .enumerate()
                .map(|(i, _)| format!("?{}", i + 6))
                .collect();
            format!("AND p.category_id IN ({})", placeholders.join(", "))
        }
        _ => String::new(),
    };

    let count_sql = format!(
        r#"
        SELECT COUNT(p.id)
        FROM products p
        JOIN store_inventory inv ON p.id = inv.product_id
        WHERE inv.store_id = ?3
          AND inv.stock > 0
          AND p.is_active = 1
          AND p.deleted_at IS NULL
          AND p.id NOT IN (
              SELECT DISTINCT si.product_id
              FROM sale_items si
              JOIN sales s ON si.sale_id = s.id
              LEFT JOIN (
                  SELECT sale_item_id, SUM(quantity) as returned_qty
                  FROM return_items
                  GROUP BY sale_item_id
              ) ri ON ri.sale_item_id = si.id
              WHERE s.created_at BETWEEN ?1 AND ?2
                AND s.status IN ('completed', 'partial_return')
                AND (si.quantity - COALESCE(ri.returned_qty, 0.0)) > 0.001
          )
          {}
        "#,
        category_filter_count
    );

    let mut count_params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(from_date.clone()),
        Box::new(to_date.clone()),
        Box::new(store_id.clone()),
    ];

    if let Some(ids) = &category_ids {
        for id in ids {
            count_params.push(Box::new(id.clone()));
        }
    }

    let count_params_refs: Vec<&dyn rusqlite::types::ToSql> =
        count_params.iter().map(|p| p.as_ref()).collect();

    let total_count: i64 = conn
        .query_row(&count_sql, count_params_refs.as_slice(), |row| row.get(0))
        .unwrap_or(0);

    let data_sql = format!(
        r#"
        SELECT 
            p.name as product_name,
            p.code as product_code,
            COALESCE(p.category_id, '') as category_id,
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
                  AND s2.status IN ('completed', 'partial_return')
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
              LEFT JOIN (
                  SELECT sale_item_id, SUM(quantity) as returned_qty
                  FROM return_items
                  GROUP BY sale_item_id
              ) ri ON ri.sale_item_id = si.id
              WHERE s.created_at BETWEEN ?1 AND ?2
                AND s.status IN ('completed', 'partial_return')
                AND (si.quantity - COALESCE(ri.returned_qty, 0.0)) > 0.001
          )
          {}
        ORDER BY {} {}
        LIMIT ?4 OFFSET ?5
    "#,
        category_filter_data,
        match sort_by.as_deref() {
            Some("product_name") => "p.name",
            Some("category_name") => "category_name",
            Some("current_stock") => "inv.stock",
            Some("purchase_price") => "p.purchase_price",
            Some("last_sale_date") => "last_sale_date",
            _ => "stagnant_value",
        },
        match sort_order.as_deref() {
            Some("desc") => "DESC",
            Some("asc") => "ASC",
            _ =>
                if sort_by.is_none() {
                    "DESC"
                } else {
                    "ASC"
                },
        }
    );

    let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;

    let mut data_params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(from_date),
        Box::new(to_date),
        Box::new(store_id),
        Box::new(page_size),
        Box::new(offset),
    ];

    if let Some(ids) = &category_ids {
        for id in ids {
            data_params.push(Box::new(id.clone()));
        }
    }

    let data_params_refs: Vec<&dyn rusqlite::types::ToSql> =
        data_params.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(data_params_refs.as_slice(), |row| {
            Ok(DeadStockProduct {
                product_name: row.get(0)?,
                product_code: row.get(1)?,
                category_id: row.get(2)?,
                category_name: row.get(3)?,
                category_color: row.get(4)?,
                current_stock: row.get(5)?,
                purchase_price: row.get(6)?,
                stagnant_value: row.get(7)?,
                last_sale_date: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let data = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    let total_pages = (total_count as f64 / page_size as f64).ceil() as i64;

    Ok(PaginatedResult {
        data,
        total: total_count,
        page,
        page_size,
        total_pages,
    })
}

#[tauri::command]
pub fn get_inventory_valuation(db: State<Mutex<Connection>>) -> Result<InventoryValuation, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let store_id = get_current_store_id(&conn)?;

    let sql = r#"
        SELECT 
            COALESCE(SUM(MAX(i.stock, 0) * COALESCE(p.purchase_price, 0)), 0.0) as total_cost,
            COALESCE(SUM(MAX(i.stock, 0) * COALESCE(p.retail_price, 0)), 0.0) as total_retail
        FROM products p
        JOIN store_inventory i ON p.id = i.product_id
        WHERE p.deleted_at IS NULL 
          AND i.stock > 0
          AND i.store_id = ?1
    "#;

    conn.query_row(sql, params![store_id], |row| {
        let total_cost: f64 = row.get(0)?;
        let total_retail: f64 = row.get(1)?;
        Ok(InventoryValuation {
            total_cost,
            total_retail,
            projected_profit: total_retail - total_cost,
        })
    })
    .map_err(|e| e.to_string())
}
#[tauri::command]
pub fn get_low_stock_products(
    db: State<Mutex<Connection>>,
    page: i64,
    page_size: i64,
    category_ids: Option<Vec<String>>,
    sort_by: Option<String>,
    sort_order: Option<String>,
) -> Result<PaginatedResult<LowStockProduct>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let store_id = get_current_store_id(&conn)?;

    let offset = (page - 1) * page_size;

    let category_filter_count = match &category_ids {
        Some(ids) if !ids.is_empty() => {
            let placeholders: Vec<String> = ids
                .iter()
                .enumerate()
                .map(|(i, _)| format!("?{}", i + 2))
                .collect();
            format!("AND p.category_id IN ({})", placeholders.join(", "))
        }
        _ => String::new(),
    };

    let category_filter_data = match &category_ids {
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

    let count_sql = format!(
        r#"
        SELECT COUNT(p.id)
        FROM products p
        JOIN store_inventory i ON p.id = i.product_id
        WHERE p.deleted_at IS NULL
          AND p.is_active = 1
          AND i.store_id = ?1
          AND i.stock <= COALESCE(i.minimum_stock, 5)
          {}
    "#,
        category_filter_count
    );

    let mut count_params: Vec<Box<dyn rusqlite::types::ToSql>> =
        vec![Box::new(store_id.clone())];

    if let Some(ids) = &category_ids {
        for id in ids {
            count_params.push(Box::new(id.clone()));
        }
    }

    let count_params_refs: Vec<&dyn rusqlite::types::ToSql> =
        count_params.iter().map(|p| p.as_ref()).collect();

    let total_count: i64 = conn
        .query_row(&count_sql, count_params_refs.as_slice(), |row| row.get(0))
        .unwrap_or(0);

    let order_column = match sort_by.as_deref() {
        Some("product_name") => "p.name",
        Some("current_stock") => "i.stock",
        Some("minimum_stock") => "minimum_stock",
        Some("suggested_order") => "suggested_order",
        Some("purchase_price") => "p.purchase_price",
        Some("retail_price") => "p.retail_price",
        _ => "c.name",
    };

    let order_direction = match sort_order.as_deref() {
        Some("desc") => "DESC",
        Some("asc") => "ASC",
        _ => {
            if sort_by.is_none() {
                "ASC"
            } else {
                "ASC"
            }
        }
    };

    let sql = format!(
        r#"
        SELECT 
            p.name as product_name,
            p.code as product_code,
            COALESCE(p.category_id, '') as category_id,
            COALESCE(c.name, 'Sin Categoría') as category_name,
            c.color as category_color,
            i.stock as current_stock,
            COALESCE(i.minimum_stock, 5) as minimum_stock,
            MAX(COALESCE(i.minimum_stock, 5) * 2 - i.stock, 0) as suggested_order,
            COALESCE(p.purchase_price, 0.0) as purchase_price,
            COALESCE(p.retail_price, 0.0) as retail_price
        FROM products p
        JOIN store_inventory i ON p.id = i.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.deleted_at IS NULL
          AND p.is_active = 1
          AND i.store_id = ?1
          AND i.stock <= COALESCE(i.minimum_stock, 5)
          {}
        ORDER BY {} {}
        LIMIT ?2 OFFSET ?3
    "#,
        category_filter_data,
        order_column, order_direction
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let mut data_params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(store_id),
        Box::new(page_size),
        Box::new(offset),
    ];

    if let Some(ids) = &category_ids {
        for id in ids {
            data_params.push(Box::new(id.clone()));
        }
    }

    let data_params_refs: Vec<&dyn rusqlite::types::ToSql> =
        data_params.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(data_params_refs.as_slice(), |row| {
            Ok(LowStockProduct {
                product_name: row.get(0)?,
                product_code: row.get(1)?,
                category_id: row.get(2)?,
                category_name: row.get(3)?,
                category_color: row.get(4)?,
                current_stock: row.get(5)?,
                minimum_stock: row.get(6)?,
                suggested_order: row.get(7)?,
                purchase_price: row.get(8)?,
                retail_price: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let data = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    let total_pages = (total_count as f64 / page_size as f64).ceil() as i64;

    Ok(PaginatedResult {
        data,
        total: total_count,
        page,
        page_size,
        total_pages,
    })
}
