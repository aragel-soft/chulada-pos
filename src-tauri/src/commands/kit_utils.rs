use rusqlite::Connection;
use std::collections::{HashMap, HashSet};

/// Struct representing kit validation rules
#[derive(Debug, Clone)]
pub struct KitRule {
    pub name: String,
    pub max_selections: i64,
    pub triggers: HashSet<String>,
    pub items: HashSet<String>,
}

/// Loads kit rules for a given set of kit_option_ids
pub fn load_kit_rules(
    conn: &Connection,
    kit_ids: &[String],
) -> Result<HashMap<String, KitRule>, String> {
    use rusqlite::params_from_iter;
    
    if kit_ids.is_empty() {
        return Ok(HashMap::new());
    }
    
    let placeholders = kit_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let mut kit_rules: HashMap<String, KitRule> = HashMap::new();

    // Fetch Kit Headers (options)
    let sql_headers = format!(
        "SELECT id, max_selections, name FROM product_kit_options WHERE id IN ({}) AND is_active = 1",
        placeholders
    );
    let mut stmt_headers = conn.prepare(&sql_headers).map_err(|e| e.to_string())?;
    let headers_iter = stmt_headers.query_map(params_from_iter(kit_ids.iter()), |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, String>(2)?))
    }).map_err(|e| e.to_string())?;

    for r in headers_iter {
        let (id, max_selections, name) = r.map_err(|e| e.to_string())?;
        kit_rules.insert(id, KitRule {
            name,
            max_selections,
            triggers: HashSet::new(),
            items: HashSet::new(),
        });
    }

    // Fetch Kit Triggers (main products)
    let sql_kit_triggers = format!(
        "SELECT kit_option_id, main_product_id FROM product_kit_main WHERE kit_option_id IN ({})",
        placeholders
    );
    let mut stmt_kit_trig = conn.prepare(&sql_kit_triggers).map_err(|e| e.to_string())?;
    let kit_trig_iter = stmt_kit_trig.query_map(params_from_iter(kit_ids.iter()), |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    for r in kit_trig_iter {
        let (kit_id, prod_id) = r.map_err(|e| e.to_string())?;
        if let Some(rule) = kit_rules.get_mut(&kit_id) {
            rule.triggers.insert(prod_id);
        }
    }

    // Fetch Kit Items (allowed products)
    let sql_kit_items = format!(
        "SELECT kit_option_id, included_product_id FROM product_kit_items WHERE kit_option_id IN ({})",
        placeholders
    );
    let mut stmt_kit_items = conn.prepare(&sql_kit_items).map_err(|e| e.to_string())?;
    let kit_items_iter = stmt_kit_items.query_map(params_from_iter(kit_ids.iter()), |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    for r in kit_items_iter {
        let (kit_id, prod_id) = r.map_err(|e| e.to_string())?;
        if let Some(rule) = kit_rules.get_mut(&kit_id) {
            rule.items.insert(prod_id);
        }
    }

    Ok(kit_rules)
}
