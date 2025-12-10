use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
  pub id: String,
  pub name: String,
  pub color: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TagInput {
  pub name: String,
  pub color: Option<String>, 
}
