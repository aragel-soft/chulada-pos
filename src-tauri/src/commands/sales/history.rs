use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesFilter {
  pub page: i64,
  pub page_size: i64,
  pub start_date: Option<String>,     
  pub end_date: Option<String>,      
  pub status: Option<Vec<String>>,   
  pub payment_method: Option<String>, 
  pub user_id: Option<String>,
  pub folio: Option<String>,         
  pub product_search: Option<String>, 
}

#[derive(Serialize)]
pub struct SaleMasterView {
  pub id: String,
  pub folio: String,
  pub sale_date: String,
  pub status: String,
  pub payment_method: String,
  pub total: f64,
  pub user_name: String,
  pub has_discount: bool,
  pub is_credit: bool,
}

#[derive(Serialize)]
pub struct PaginatedSalesResponse {
  pub data: Vec<SaleMasterView>,
  pub total: i64,
  pub page: i64,
  pub page_size: i64,
  pub total_pages: i64,
}

#[derive(Serialize)]
pub struct SaleDetailView {
  pub id: String,
  pub folio: String,
  pub sale_date: String,
  pub status: String,
  pub payment_method: String,
  pub subtotal: f64,
  pub discount_global_percent: f64,
  pub discount_global_amount: f64,
  pub total: f64,
  pub cash_amount: f64,
  pub card_amount: f64, // card_transfer_amount in DB
  pub change_returned: f64,
  pub notes: Option<String>,
  pub user_name: String,
  pub user_avatar: Option<String>,
  pub cancellation_reason: Option<String>,
  pub cancelled_at: Option<String>,
  pub items: Vec<SaleItemView>,
}

#[derive(Serialize)]
pub struct SaleItemView {
  pub id: String,
  pub product_name: String,
  pub quantity: f64,
  pub unit_price: f64,
  pub subtotal: f64,
  pub price_type: String, // 'retail', 'wholesale', 'promo'
  pub is_kit_item: bool,
  pub is_gift: bool, // quantity > 0 && price == 0
  pub product_image: Option<String>,
}

#[tauri::command]
pub fn get_sales_history(
  db: State<'_, Mutex<Connection>>,
  filter: SalesFilter,
) -> Result<PaginatedSalesResponse, String> {
  let conn = db.lock().map_err(|e| e.to_string())?;

  let mut where_clauses = vec!["s.sale_date IS NOT NULL".to_string()];
  let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

  if let Some(start) = &filter.start_date {
    where_clauses.push("s.sale_date >= ?".to_string());
    params.push(Box::new(format!("{} 00:00:00", start)));
  }
  if let Some(end) = &filter.end_date {
    where_clauses.push("s.sale_date <= ?".to_string());
    params.push(Box::new(format!("{} 23:59:59", end)));
  }

  if let Some(statuses) = &filter.status {
    if !statuses.is_empty() {
      let placeholders: Vec<String> = statuses.iter().map(|_| "?".to_string()).collect();
      where_clauses.push(format!("s.status IN ({})", placeholders.join(",")));
      for st in statuses {
        params.push(Box::new(st.clone()));
      }
    }
  }

  if let Some(method) = &filter.payment_method {
    if method != "all" && !method.is_empty() {
      where_clauses.push("s.payment_method = ?".to_string());
      params.push(Box::new(method.clone()));
    }
  }

  if let Some(uid) = &filter.user_id {
    if !uid.is_empty() {
      where_clauses.push("s.user_id = ?".to_string());
      params.push(Box::new(uid.clone()));
    }
  }

  if let Some(folio) = &filter.folio {
    if !folio.is_empty() {
      where_clauses.push("s.folio LIKE ?".to_string());
      params.push(Box::new(format!("%{}%", folio)));
    }
  }

  if let Some(prod_query) = &filter.product_search {
    if !prod_query.is_empty() {
      where_clauses.push(
        "EXISTS (
        SELECT 1 FROM sale_items si 
        WHERE si.sale_id = s.id 
        AND si.product_name LIKE ?
      )"
        .to_string(),
      );
      params.push(Box::new(format!("%{}%", prod_query)));
    }
  }

  let where_sql = where_clauses.join(" AND ");

  let count_sql = format!("SELECT COUNT(*) FROM sales s WHERE {}", where_sql);
  let total_rows: i64 = conn
    .query_row(
      &count_sql,
      rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())),
      |row| row.get(0),
    )
    .map_err(|e| format!("Error contando ventas: {}", e))?;

  let limit = filter.page_size;
  let offset = (filter.page - 1) * filter.page_size;

  let list_sql = format!(
    "SELECT 
        s.id, s.folio, s.sale_date, s.status, s.payment_method, s.total, 
        u.username as user_name, s.has_discount
     FROM sales s
     LEFT JOIN users u ON s.user_id = u.id
     WHERE {}
     ORDER BY s.sale_date DESC
     LIMIT {} OFFSET {}",
    where_sql, limit, offset
  );

  let mut stmt = conn.prepare(&list_sql).map_err(|e| e.to_string())?;

  let rows = stmt
    .query_map(
      rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())),
      |row| {
        let payment_method: String = row.get(4)?;
        Ok(SaleMasterView {
          id: row.get(0)?,
          folio: row.get(1)?,
          sale_date: row.get(2)?,
          status: row.get(3)?,
          is_credit: payment_method == "credit",
          payment_method,
          total: row.get(5)?,
          user_name: row.get(6).unwrap_or("Desconocido".to_string()),
          has_discount: row.get(7).unwrap_or(false),
        })
      },
    )
    .map_err(|e| e.to_string())?;

  let mut data = Vec::new();
  for r in rows {
    data.push(r.map_err(|e| e.to_string())?);
  }

  let total_pages = (total_rows as f64 / filter.page_size as f64).ceil() as i64;

  Ok(PaginatedSalesResponse {
    data,
    total: total_rows,
    page: filter.page,
    page_size: filter.page_size,
    total_pages,
  })
}

#[tauri::command]
pub fn get_sale_details(
  app_handle: AppHandle,
  db: State<'_, Mutex<Connection>>,
  sale_id: String,
) -> Result<SaleDetailView, String> {
  let conn = db.lock().map_err(|e| e.to_string())?;
  let app_dir = app_handle.path().app_data_dir().unwrap();

  let header_sql = "
    SELECT 
      s.id, s.folio, s.sale_date, s.status, s.payment_method, 
      s.subtotal, s.discount_percentage, s.discount_amount, s.total,
      s.cash_amount, s.card_transfer_amount, s.notes,
      s.cancellation_reason, s.cancelled_at,
      u.username, u.avatar_url
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  ";

  let mut stmt = conn.prepare(header_sql).map_err(|e| e.to_string())?;

  let mut sale: SaleDetailView = stmt
    .query_row([&sale_id], |row| {
      let raw_avatar: Option<String> = row.get(15)?;
      let resolved_avatar = raw_avatar.map(|path| {
        if path.starts_with("http") {
          path
        } else {
          app_dir.join(path).to_string_lossy().to_string()
        }
      });

      let cash: f64 = row.get(9).unwrap_or(0.0);
      let total: f64 = row.get(8)?;
      let change = if cash > total { cash - total } else { 0.0 };

      Ok(SaleDetailView {
        id: row.get(0)?,
        folio: row.get(1)?,
        sale_date: row.get(2)?,
        status: row.get(3)?,
        payment_method: row.get(4)?,
        subtotal: row.get(5)?,
        discount_global_percent: row.get(6).unwrap_or(0.0),
        discount_global_amount: row.get(7).unwrap_or(0.0),
        total,
        cash_amount: cash,
        card_amount: row.get(10).unwrap_or(0.0),
        change_returned: change,
        notes: row.get(11)?,
        cancellation_reason: row.get(12)?,
        cancelled_at: row.get(13)?,
        user_name: row.get(14).unwrap_or("Desconocido".to_string()),
        user_avatar: resolved_avatar,
        items: Vec::new(),
      })
    })
    .map_err(|e| format!("Venta no encontrada: {}", e))?;

  let items_sql = "
    SELECT 
      si.id, si.product_name, si.quantity, si.unit_price, si.subtotal,
      si.price_type, si.is_kit_item,
      p.image_url
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
    ORDER BY si.is_kit_item ASC, si.product_name ASC
  ";

  let mut stmt_items = conn.prepare(items_sql).map_err(|e| e.to_string())?;
  let items_iter = stmt_items
    .query_map([&sale_id], |row| {
      let raw_img: Option<String> = row.get(7)?;
      let resolved_img = raw_img.map(|path| {
        if path.starts_with("http") {
            path
        } else {
            app_dir.join(path).to_string_lossy().to_string()
        }
      });

      let unit_price: f64 = row.get(3)?;

      Ok(SaleItemView {
          id: row.get(0)?,
          product_name: row.get(1)?,
          quantity: row.get(2)?,
          unit_price,
          subtotal: row.get(4)?,
          price_type: row.get(5)?,
          is_kit_item: row.get(6).unwrap_or(false),
          is_gift: unit_price == 0.0,
          product_image: resolved_img,
      })
    })
    .map_err(|e| e.to_string())?;

  for item in items_iter {
    sale.items.push(item.map_err(|e| e.to_string())?);
  }

  Ok(sale)
}
