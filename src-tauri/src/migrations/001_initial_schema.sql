-- =======================================
-- TABLAS Y ESQUEMA DE LA BASE DE DATOS
-- =======================================
-- Tablas sin dependencias directas
CREATE TABLE IF NOT EXISTS "categories" (
	"id"	TEXT,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"parent_category_id"	TEXT,
	"color"	TEXT,
	"is_active"	BOOLEAN DEFAULT 1,
	"sequence"	INTEGER DEFAULT 0,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"deleted_at"	DATETIME,
	PRIMARY KEY("id"),
	FOREIGN KEY("parent_category_id") REFERENCES "categories"("id")
);

CREATE TABLE IF NOT EXISTS "customers" (
	"id"	TEXT,
	"code"	TEXT UNIQUE,
	"name"	TEXT NOT NULL,
	"phone"	TEXT,
	"email"	TEXT,
	"address"	TEXT,
	"credit_limit"	DECIMAL(10, 2) DEFAULT 500.00,
	"current_balance"	DECIMAL(10, 2) DEFAULT 0,
	"notes"	TEXT,
	"is_active"	BOOLEAN DEFAULT 1,
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"deleted_at"	TIMESTAMP,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "permissions" (
	"id"	TEXT NOT NULL,
	"name"	TEXT NOT NULL UNIQUE,
	"display_name"	TEXT NOT NULL,
	"description"	TEXT,
	"module"	TEXT NOT NULL,
	"is_active"	INTEGER NOT NULL DEFAULT 1 CHECK("is_active" IN (0, 1)),
	"created_at"	TEXT NOT NULL DEFAULT (datetime('now')),
	"sequence"	INTEGER DEFAULT 0,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "product_kit_options" (
	"id"	TEXT,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"is_required"	BOOLEAN DEFAULT 1,
	"max_selections"	INTEGER DEFAULT 1,
	"is_active"	BOOLEAN DEFAULT 1,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"deleted_at"	DATETIME,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "promotions" (
	"id"	TEXT,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"type"	TEXT NOT NULL DEFAULT 'combo',
	"combo_price"	DECIMAL(10, 2) NOT NULL,
	"start_date"	TEXT NOT NULL,
	"end_date"	TEXT NOT NULL,
	"is_active"	BOOLEAN DEFAULT 1,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"deleted_at"	DATETIME,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "roles" (
	"id"	TEXT NOT NULL,
	"name"	TEXT NOT NULL UNIQUE,
	"display_name"	TEXT NOT NULL,
	"description"	TEXT,
	"is_active"	INTEGER NOT NULL DEFAULT 1 CHECK("is_active" IN (0, 1)),
	"created_at"	TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "system_settings" (
	"key"	TEXT NOT NULL,
	"value"	TEXT NOT NULL,
	"updated_at"	TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY("key")
);

CREATE TABLE IF NOT EXISTS "tags" (
	"id"	TEXT,
	"name"	TEXT NOT NULL UNIQUE,
	"color"	TEXT DEFAULT '#64748b',
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id")
);

-- Tablas con nivel 1 de dependencias
CREATE TABLE IF NOT EXISTS "users" (
	"id"	TEXT NOT NULL,
	"username"	TEXT NOT NULL UNIQUE,
	"password_hash"	TEXT NOT NULL,
	"full_name"	TEXT NOT NULL,
	"role_id"	TEXT NOT NULL,
	"is_active"	INTEGER NOT NULL DEFAULT 1 CHECK("is_active" IN (0, 1)),
	"created_at"	TEXT NOT NULL DEFAULT (datetime('now')),
	"updated_at"	TEXT NOT NULL DEFAULT (datetime('now')),
	"deleted_at"	TEXT,
	"avatar_url"	TEXT,
	PRIMARY KEY("id"),
	FOREIGN KEY("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "products" (
	"id"	TEXT,
	"code"	TEXT NOT NULL,
	"barcode"	TEXT,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"category_id"	TEXT NOT NULL,
	"retail_price"	DECIMAL(10, 2) NOT NULL,
	"wholesale_price"	DECIMAL(10, 2) NOT NULL,
	"purchase_price"	DECIMAL(10, 2) DEFAULT 0,
	"unit_of_measure"	TEXT DEFAULT 'piece',
	"image_url"	TEXT,
	"is_active"	BOOLEAN DEFAULT 1,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"deleted_at"	DATETIME,
	PRIMARY KEY("id"),
	FOREIGN KEY("category_id") REFERENCES "categories"("id")
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
	"id"	TEXT NOT NULL,
	"role_id"	TEXT NOT NULL,
	"permission_id"	TEXT NOT NULL,
	"created_at"	TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY("id"),
	UNIQUE("role_id","permission_id"),
	FOREIGN KEY("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE,
	FOREIGN KEY("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
);

-- Tablas con nivel 2 y superior de dependencias (Múltiples llaves foráneas)
CREATE TABLE IF NOT EXISTS "cash_register_shifts" (
	"id"	INTEGER,
	"initial_cash"	DECIMAL(10, 2) NOT NULL DEFAULT 0,
	"opening_date"	TEXT NOT NULL,
	"closing_date"	TEXT,
	"opening_user_id"	TEXT NOT NULL,
	"closing_user_id"	TEXT,
	"status"	TEXT NOT NULL DEFAULT 'open',
	"notes"	TEXT,
	"code"	TEXT,
	"created_at"	TEXT DEFAULT (datetime('now')),
	"updated_at"	TEXT DEFAULT (datetime('now')),
	"expected_cash"	DECIMAL(10, 2),
	"cash_withdrawal"	DECIMAL(10, 2),
	"total_sales"	DECIMAL(10, 2),
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("closing_user_id") REFERENCES "users"("id"),
	FOREIGN KEY("opening_user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "cash_movements" (
	"id"	INTEGER,
	"cash_register_shift_id"	INTEGER NOT NULL,
	"type"	TEXT NOT NULL,
	"amount"	DECIMAL(10, 2) NOT NULL,
	"concept"	TEXT NOT NULL,
	"description"	TEXT,
	"created_at"	TEXT DEFAULT (datetime('now')),
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("cash_register_shift_id") REFERENCES "cash_register_shifts"("id")
);

CREATE TABLE IF NOT EXISTS "sales" (
	"id"	TEXT NOT NULL,
	"folio"	TEXT NOT NULL UNIQUE,
	"sale_date"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"subtotal"	DECIMAL(10, 2) NOT NULL,
	"discount_percentage"	DECIMAL(5, 2) DEFAULT 0,
	"discount_amount"	DECIMAL(10, 2) DEFAULT 0,
	"total"	DECIMAL(10, 2) NOT NULL,
	"status"	TEXT NOT NULL DEFAULT 'completed',
	"customer_id"	TEXT,
	"user_id"	TEXT NOT NULL,
	"cash_register_shift_id"	TEXT,
	"payment_method"	TEXT NOT NULL,
	"cash_amount"	DECIMAL(10, 2) DEFAULT 0,
	"card_transfer_amount"	DECIMAL(10, 2) DEFAULT 0,
	"notes"	TEXT,
	"has_discount"	BOOLEAN DEFAULT 0,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"is_synced"	BOOLEAN DEFAULT 0,
	"synced_at"	DATETIME,
	"cancellation_reason"	TEXT,
	"cancelled_by"	TEXT,
	"cancelled_at"	DATETIME,
	PRIMARY KEY("id"),
	FOREIGN KEY("cash_register_shift_id") REFERENCES "cash_register_shifts"("id"),
	FOREIGN KEY("user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "sale_items" (
	"id"	TEXT NOT NULL,
	"sale_id"	TEXT NOT NULL,
	"product_id"	TEXT NOT NULL,
	"product_name"	TEXT NOT NULL,
	"product_code"	TEXT NOT NULL,
	"quantity"	DECIMAL(10, 3) NOT NULL,
	"unit_price"	DECIMAL(10, 2) NOT NULL,
	"price_type"	TEXT NOT NULL,
	"promotion_id"	TEXT,
	"discount_percentage"	DECIMAL(5, 2) DEFAULT 0,
	"discount_amount"	DECIMAL(10, 2) DEFAULT 0,
	"subtotal"	DECIMAL(10, 2) NOT NULL,
	"kit_option_id"	TEXT,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"total"	DECIMAL(10, 2),
	PRIMARY KEY("id"),
	FOREIGN KEY("kit_option_id") REFERENCES "product_kit_options"("id"),
	FOREIGN KEY("product_id") REFERENCES "products"("id"),
	FOREIGN KEY("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL,
	FOREIGN KEY("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "debt_payments" (
	"id"	TEXT,
	"folio"	TEXT NOT NULL UNIQUE,
	"customer_id"	TEXT NOT NULL,
	"sale_id"	TEXT,
	"amount"	DECIMAL(10, 2) NOT NULL,
	"payment_date"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"payment_method"	TEXT DEFAULT 'cash',
	"user_id"	TEXT NOT NULL,
	"notes"	TEXT,
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"is_synced"	BOOLEAN DEFAULT 0,
	"synced_at"	TIMESTAMP,
	"cash_register_shift_id"	TEXT,
	"cash_amount"	DECIMAL(10, 2) DEFAULT 0,
	"card_transfer_amount"	DECIMAL(10, 2) DEFAULT 0,
	PRIMARY KEY("id"),
	FOREIGN KEY("customer_id") REFERENCES "customers"("id"),
	FOREIGN KEY("user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "inventory_movements" (
	"id"	TEXT NOT NULL,
	"product_id"	TEXT NOT NULL,
	"store_id"	TEXT NOT NULL,
	"user_id"	TEXT NOT NULL,
	"type"	TEXT NOT NULL CHECK("type" IN ('IN', 'OUT')),
	"reason"	TEXT NOT NULL,
	"quantity"	INTEGER NOT NULL,
	"previous_stock"	INTEGER NOT NULL,
	"new_stock"	INTEGER NOT NULL,
	"cost"	DECIMAL(10, 2),
	"reference"	TEXT,
	"notes"	TEXT,
	"created_at"	DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id"),
	FOREIGN KEY("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
	FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "product_kit_items" (
	"id"	TEXT,
	"kit_option_id"	TEXT NOT NULL,
	"included_product_id"	TEXT NOT NULL,
	"quantity"	INTEGER DEFAULT 1,
	"sort_order"	INTEGER DEFAULT 0,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id"),
	FOREIGN KEY("included_product_id") REFERENCES "products"("id"),
	FOREIGN KEY("kit_option_id") REFERENCES "product_kit_options"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "product_kit_main" (
	"kit_option_id"	TEXT NOT NULL,
	"main_product_id"	TEXT NOT NULL,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("kit_option_id","main_product_id"),
	FOREIGN KEY("kit_option_id") REFERENCES "product_kit_options"("id") ON DELETE CASCADE,
	FOREIGN KEY("main_product_id") REFERENCES "products"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "product_tags" (
	"id"	TEXT,
	"product_id"	TEXT NOT NULL,
	"tag_id"	TEXT NOT NULL,
	"assigned_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id"),
	FOREIGN KEY("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
	FOREIGN KEY("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "promotion_combos" (
	"id"	TEXT,
	"promotion_id"	TEXT NOT NULL,
	"product_id"	TEXT NOT NULL,
	"quantity"	INTEGER DEFAULT 1,
	PRIMARY KEY("id"),
	FOREIGN KEY("product_id") REFERENCES "products"("id"),
	FOREIGN KEY("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "returns" (
	"id"	TEXT NOT NULL,
	"folio"	INTEGER NOT NULL UNIQUE,
	"sale_id"	TEXT NOT NULL,
	"return_date"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"total"	DECIMAL(10, 2) NOT NULL,
	"reason"	TEXT NOT NULL,
	"refund_method"	TEXT NOT NULL DEFAULT 'cash',
	"user_id"	TEXT NOT NULL,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"is_synced"	BOOLEAN DEFAULT 0,
	"synced_at"	DATETIME,
	"notes"	TEXT,
	PRIMARY KEY("id"),
	FOREIGN KEY("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE,
	FOREIGN KEY("user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "return_items" (
	"id"	TEXT NOT NULL,
	"return_id"	TEXT NOT NULL,
	"sale_item_id"	TEXT NOT NULL,
	"product_id"	TEXT NOT NULL,
	"quantity"	DECIMAL(10, 3) NOT NULL,
	"unit_price"	DECIMAL(10, 2) NOT NULL,
	"subtotal"	DECIMAL(10, 2) NOT NULL,
	PRIMARY KEY("id"),
	FOREIGN KEY("product_id") REFERENCES "products"("id"),
	FOREIGN KEY("return_id") REFERENCES "returns"("id") ON DELETE CASCADE,
	FOREIGN KEY("sale_item_id") REFERENCES "sale_items"("id")
);

CREATE TABLE IF NOT EXISTS "store_inventory" (
	"id"	TEXT,
	"store_id"	TEXT NOT NULL,
	"product_id"	TEXT NOT NULL,
	"stock"	INTEGER DEFAULT 0,
	"minimum_stock"	INTEGER DEFAULT 5,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id"),
	UNIQUE("store_id","product_id"),
	FOREIGN KEY("product_id") REFERENCES "products"("id")
);

CREATE TABLE IF NOT EXISTS "store_vouchers" (
	"id"	TEXT NOT NULL,
	"sale_id"	TEXT NOT NULL,
	"code"	TEXT NOT NULL UNIQUE,
	"initial_balance"	DECIMAL(10, 2) NOT NULL,
	"current_balance"	DECIMAL(10, 2) NOT NULL,
	"is_active"	BOOLEAN DEFAULT 1,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"updated_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"used_at"	DATETIME,
	"expires_at"	DATETIME,
	PRIMARY KEY("id"),
	FOREIGN KEY("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "sale_vouchers" (
	"id"	TEXT NOT NULL,
	"sale_id"	TEXT NOT NULL,
	"voucher_id"	TEXT NOT NULL,
	"amount"	DECIMAL(10, 2) NOT NULL,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id"),
	FOREIGN KEY("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE,
	FOREIGN KEY("voucher_id") REFERENCES "store_vouchers"("id")
);

-- ========================
-- ÍNDICES DE RENDIMIENTO 
-- ========================
CREATE INDEX IF NOT EXISTS "idx_customers_balance" ON "customers" ("current_balance");
CREATE INDEX IF NOT EXISTS "idx_customers_deleted" ON "customers" ("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_customers_search" ON "customers" ("name", "phone", "code");
CREATE INDEX IF NOT EXISTS "idx_kit_items_option" ON "product_kit_items" ("kit_option_id");
CREATE INDEX IF NOT EXISTS "idx_movements_date" ON "inventory_movements" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_movements_product" ON "inventory_movements" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_movements_shift" ON "cash_movements" ("cash_register_shift_id");
CREATE INDEX IF NOT EXISTS "idx_movements_type" ON "inventory_movements" ("type");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_one_kit_per_product" ON "product_kit_main" ("main_product_id");
CREATE INDEX IF NOT EXISTS "idx_product_tags_product_id" ON "product_tags" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_product_tags_tag_id" ON "product_tags" ("tag_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_tags_unique" ON "product_tags" ("product_id", "tag_id");
CREATE INDEX IF NOT EXISTS "idx_products_category" ON "products" ("category_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_products_code_active" ON "products" ("code") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_products_name" ON "products" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_promo_product_unique" ON "promotion_combos" ("promotion_id", "product_id");
CREATE INDEX IF NOT EXISTS "idx_promotions_dates" ON "promotions" ("start_date", "end_date") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_return_items_return_id" ON "return_items" ("return_id");
CREATE INDEX IF NOT EXISTS "idx_return_items_sale_item_id" ON "return_items" ("sale_item_id");
CREATE INDEX IF NOT EXISTS "idx_returns_date" ON "returns" ("return_date");
CREATE INDEX IF NOT EXISTS "idx_returns_folio" ON "returns" ("folio");
CREATE INDEX IF NOT EXISTS "idx_returns_sale_id" ON "returns" ("sale_id");
CREATE INDEX IF NOT EXISTS "idx_role_permissions_permission" ON "role_permissions" ("permission_id");
CREATE INDEX IF NOT EXISTS "idx_role_permissions_role" ON "role_permissions" ("role_id");
CREATE INDEX IF NOT EXISTS "idx_sale_items_product_id" ON "sale_items" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_sale_items_sale_id" ON "sale_items" ("sale_id");
CREATE INDEX IF NOT EXISTS "idx_sale_vouchers_sale_id" ON "sale_vouchers" ("sale_id");
CREATE INDEX IF NOT EXISTS "idx_sale_vouchers_voucher_id" ON "sale_vouchers" ("voucher_id");
CREATE INDEX IF NOT EXISTS "idx_sales_created_at_status" ON "sales" ("created_at", "status");
CREATE INDEX IF NOT EXISTS "idx_sales_date" ON "sales" ("sale_date");
CREATE INDEX IF NOT EXISTS "idx_sales_folio" ON "sales" ("folio");
CREATE INDEX IF NOT EXISTS "idx_sales_user" ON "sales" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_shifts_code" ON "cash_register_shifts" ("code");
CREATE INDEX IF NOT EXISTS "idx_shifts_opening_user" ON "cash_register_shifts" ("opening_user_id");
CREATE INDEX IF NOT EXISTS "idx_shifts_status" ON "cash_register_shifts" ("status");
CREATE INDEX IF NOT EXISTS "idx_store_vouchers_active" ON "store_vouchers" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_store_vouchers_code" ON "store_vouchers" ("code");
CREATE INDEX IF NOT EXISTS "idx_store_vouchers_sale_id" ON "store_vouchers" ("sale_id");
CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_users_role_id" ON "users" ("role_id");
CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users" ("username");
