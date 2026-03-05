import csv
import sqlite3
import uuid
import os
import glob
import shutil
from datetime import datetime

try:
    from argon2 import PasswordHasher
except ImportError:
    print("⚠️ Missing dependency. Please install argon2-cffi:")
    print("pip install argon2-cffi")
    exit(1)

# ==========================================
# CONFIGURATION AND PATHS
# ==========================================
EMPTY_DB_PATH = 'database.empty.db' # Your clean template
DB_PATH = 'database.db'             # The working file
CSV_DIR = './' 

# In-Memory Mapping Dictionaries (Old ID -> New UUID)
customer_map = {}
category_map = {}
user_map = {}
product_map = {}
shift_map = {} 
sale_map = {}

# Initialize Argon2 Hasher with default secure parameters
ph = PasswordHasher()

def reset_database():
    """Copies the empty database template to create a fresh working database."""
    if not os.path.exists(EMPTY_DB_PATH):
        raise FileNotFoundError(f"Empty database template not found at: {EMPTY_DB_PATH}")
    
    print(f"🔄 Resetting database: Copying {EMPTY_DB_PATH} -> {DB_PATH}")
    shutil.copy2(EMPTY_DB_PATH, DB_PATH)

def get_db_connection():
    """Creates and returns the SQLite database connection."""
    conn = sqlite3.connect(DB_PATH)
    # Enable foreign key support to catch relationship errors
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def safe_float(value, default=0.0):
    """Converts empty or null strings to a safe float."""
    try:
        if not value or value.strip() == '':
            return default
        return float(value)
    except ValueError:
        return default

# ==========================================
# PHASE 1: CUSTOMERS
# ==========================================
def migrate_customers(conn):
    print("\n--- Migrating Customers ---")
    customer_files = glob.glob(os.path.join(CSV_DIR, 'CLIENTES_*.csv'))
    
    if not customer_files:
        print("⚠️ No file matching CLIENTES_*.csv was found.")
        return
    
    csv_file = customer_files[0]
    print(f"📄 Reading file: {csv_file}")
    
    cursor = conn.cursor()
    inserted_records = 0
    
    with open(csv_file, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        for row in reader:
            new_uuid = str(uuid.uuid4())
            old_id = row['NUMERO'].strip()
            
            name = row['NOMBRE'].strip()
            address = row['DIRECCION'].strip()
            phone = row['TELEFONO'].strip()
            current_balance = safe_float(row['DSALDOACTUAL'])
            credit_limit = safe_float(row['LIMITE_CREDITO'], 500.0) 
            
            customer_map[old_id] = new_uuid
            
            try:
                cursor.execute("""
                    INSERT INTO customers (
                        id, code, name, phone, address, 
                        credit_limit, current_balance, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                """, (
                    new_uuid, old_id, name, phone, address, 
                    credit_limit, current_balance
                ))
                inserted_records += 1
            except sqlite3.IntegrityError as e:
                print(f"❌ Integrity error inserting customer '{name}' (Old ID: {old_id}): {e}")

    conn.commit()
    print(f"✅ Customers migration completed: {inserted_records} records inserted.")

# ==========================================
# PHASE 2: USERS
# ==========================================
def migrate_users(conn):
    print("\n--- Migrating Users ---")
    user_files = glob.glob(os.path.join(CSV_DIR, 'USUARIOS_*.csv'))
    
    if not user_files:
        print("⚠️ No file matching USUARIOS_*.csv was found.")
        return
    
    csv_file = user_files[0]
    print(f"📄 Reading file: {csv_file}")
    
    cursor = conn.cursor()
    inserted_records = 0
    
    # ID of the Cashier role from your database
    CASHIER_ROLE_ID = '550e8400-e29b-41d4-a716-446655440003'
    
    with open(csv_file, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            new_uuid = str(uuid.uuid4())
            old_id = row['ID'].strip()
            
            full_name = row['NOMBRE_COMPLETO'].strip()
            username = row['USUARIO'].strip()
            raw_password = row['CLAVE'].strip()
            is_active = 1 if row['ACTIVO'] == '1' else 0
            created_at = row['CREATED_ON'].strip()
            
            # --- DATA CLEANING ---
            if not username:
                username = f"usuario_{old_id}"
                
            if username.lower() == 'admin':
                username = "admin_migrado"
                
            if "(Eliminado" in full_name or "(Eliminado" in username:
                is_active = 0
                username = f"{username}_{old_id}_eliminado"
                
            if not raw_password:
                raw_password = "1234" # Fallback pin if empty
                
            if not created_at:
                created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # --- PASSWORD HASHING (ARGON2) ---
            try:
                # This generates the PHC string format compatible with Rust
                hashed_password = ph.hash(raw_password)
            except Exception as e:
                print(f"⚠️ Error hashing password for user '{username}': {e}")
                hashed_password = ""

            user_map[old_id] = new_uuid
            
            try:
                cursor.execute("""
                    INSERT INTO users (
                        id, username, password_hash, full_name, 
                        role_id, is_active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    new_uuid, username, hashed_password, full_name, 
                    CASHIER_ROLE_ID, is_active, created_at, created_at
                ))
                inserted_records += 1
            except sqlite3.IntegrityError as e:
                print(f"❌ Integrity error inserting user '{username}' (Old ID: {old_id}): {e}")

    conn.commit()
    print(f"✅ Users migration completed: {inserted_records} records inserted.")

# ==========================================
# PHASE 3: CATEGORIES (DEPARTAMENTOS)
# ==========================================
def migrate_categories(conn):
    print("\n--- Migrating Categories (Departamentos) ---")
    
    # We use glob to find the file regardless of the timestamp
    category_files = glob.glob(os.path.join(CSV_DIR, 'DEPARTAMENTOS_*.csv'))
    
    if not category_files:
        print("⚠️ No file matching DEPARTAMENTOS_*.csv was found.")
        return
    
    csv_file = category_files[0]
    print(f"📄 Reading file: {csv_file}")
    
    cursor = conn.cursor()
    inserted_records = 0
    
    with open(csv_file, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            new_uuid = str(uuid.uuid4())
            old_id = row['ID'].strip()
            
            # --- DATA CLEANING ---
            name = row['NOMBRE'].strip()
            is_active = 1 if row['ACTIVO'].strip() == '1' else 0
            
            # Clean up the name for soft-deleted categories
            if "(Eliminado" in name:
                # We split by "(Eliminado" and keep the first part to have a clean name
                name = name.split("(Eliminado")[0].strip()
                is_active = 0  # Double-check that it is inactive
                
            # --- MAP STORAGE ---
            # Save to memory map for the Products phase! This is critical.
            category_map[old_id] = new_uuid
            
            # --- SQLITE INSERTION ---
            try:
                # We only insert id, name and is_active. 
                # sequence, created_at, updated_at will take their SQLite DEFAULT values.
                # parent_category_id will be NULL since the old system has a flat hierarchy.
                cursor.execute("""
                    INSERT INTO categories (
                        id, name, is_active
                    ) VALUES (?, ?, ?)
                """, (new_uuid, name, is_active))
                inserted_records += 1
            except sqlite3.IntegrityError as e:
                print(f"❌ Integrity error inserting category '{name}' (Old ID: {old_id}): {e}")

    conn.commit()
    print(f"✅ Categories migration completed: {inserted_records} records inserted.")

# ==========================================
# PHASE 4: PRODUCTS
# ==========================================
def migrate_products(conn):
    print("\n--- Migrating Products ---")
    
    product_files = glob.glob(os.path.join(CSV_DIR, 'PRODUCTOS_*.csv'))
    
    if not product_files:
        print("⚠️ No file matching PRODUCTOS_*.csv was found.")
        return
    
    csv_file = product_files[0]
    print(f"📄 Reading file: {csv_file}")
    
    cursor = conn.cursor()
    inserted_records = 0
    
    # Fallback category (ID '0' in your old system usually means "- Sin Departamento -")
    # We grab its new UUID. If not found, we pick the first available category.
    default_category_id = category_map.get('0') 
    if not default_category_id and category_map:
        default_category_id = list(category_map.values())[0]
        
    if not default_category_id:
        print("❌ ERROR: Cannot migrate products without at least one category mapped.")
        return
    
    with open(csv_file, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            new_uuid = str(uuid.uuid4())
            old_code = row['CODIGO'].strip()
            
            # --- DATA CLEANING ---
            name = row['DESCRIPCION'].strip()
            dept_id = row['DEPT'].strip()
            
            retail_price = safe_float(row['PVENTA'])
            wholesale_price = safe_float(row['MAYOREO'])
            purchase_price = safe_float(row['PCOSTO'])
            
            # Fallback if wholesale price wasn't configured
            if wholesale_price == 0.0:
                wholesale_price = retail_price
                
            # Soft delete check
            is_active = 1
            if "(Eliminado" in name:
                name = name.split("(Eliminado")[0].strip()
                is_active = 0
                
            # Ensure code is never completely empty
            code = old_code
            if not code:
                # Generate a safe temporary code
                code = f"PROD-NO-CODE-{uuid.uuid4().hex[:6].upper()}"
                
            # If code is strictly numeric, assume it's a barcode
            barcode = old_code if old_code.isdigit() else None
            
            # --- RELATIONSHIP MAPPING ---
            category_id = category_map.get(dept_id, default_category_id)
            
            # Save mapping (Critical for Inventory Movements and Sale Items)
            # Using old_code as the key since that's what ties it to the other files
            product_map[old_code] = new_uuid
            
            # --- SQLITE INSERTION ---
            try:
                # unit_of_measure will take the default 'piece'
                cursor.execute("""
                    INSERT INTO products (
                        id, code, barcode, name, category_id,
                        retail_price, wholesale_price, purchase_price,
                        is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    new_uuid, code, barcode, name, category_id,
                    retail_price, wholesale_price, purchase_price,
                    is_active
                ))
                inserted_records += 1
            except sqlite3.IntegrityError as e:
                print(f"❌ Integrity error inserting product '{name}' (Code: {code}): {e}")

    conn.commit()
    print(f"✅ Products migration completed: {inserted_records} records inserted.")

# ==========================================
# PHASE 5: CASH REGISTER SHIFTS (OPERACIONES)
# ==========================================
def migrate_shifts(conn):
    print("\n--- Migrating Cash Register Shifts (Operaciones) ---")
    
    shift_files = glob.glob(os.path.join(CSV_DIR, 'OPERACIONES_*.csv'))
    
    if not shift_files:
        print("⚠️ No file matching OPERACIONES_*.csv was found.")
        return
    
    csv_file = shift_files[0]
    print(f"📄 Reading file: {csv_file}")
    
    cursor = conn.cursor()
    inserted_records = 0
    
    fallback_user_id = list(user_map.values())[0] if user_map else None
    
    with open(csv_file, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            old_id = row['ID'].strip()
            shift_id = int(old_id) 
            
            initial_cash = safe_float(row['DINERO_EN_CAJA'])
            opening_date = row['INICIO_EN'].strip()
            closing_date = row['CERRO_EN'].strip()
            
            old_user_id = row['INICIO_USUARIO_ID'].strip()
            user_id = user_map.get(old_user_id, fallback_user_id)
            
            # --- FORCE CLOSED STATUS ---
            # We assume all historical shifts are closed to prevent ghost shifts
            status = 'closed'
            
            # If for some reason closing_date is empty in the CSV, 
            # we use the opening_date to satisfy the schema requirement for closed shifts
            if not closing_date:
                closing_date = opening_date
                
            # Assume the user who opened it, closed it
            closing_user_id = user_id
                
            total_sales = safe_float(row['VENTAS'])
            cash_withdrawal = safe_float(row['SALIDAS'])
            cash_entries = safe_float(row['ENTRADAS'])
            cash_income = safe_float(row['INGRESOS_EFECTIVO'])
            
            expected_cash = initial_cash + cash_entries + cash_income - cash_withdrawal
            
            shift_map[old_id] = shift_id
            
            try:
                cursor.execute("""
                    INSERT INTO cash_register_shifts (
                        id, initial_cash, opening_date, closing_date, 
                        opening_user_id, closing_user_id, status, 
                        expected_cash, cash_withdrawal, total_sales,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    shift_id, initial_cash, opening_date, closing_date,
                    user_id, closing_user_id, status,
                    expected_cash, cash_withdrawal, total_sales,
                    opening_date, closing_date
                ))
                inserted_records += 1
            except sqlite3.IntegrityError as e:
                print(f"❌ Integrity error inserting shift ID '{shift_id}': {e}")

    conn.commit()
    print(f"✅ Shifts migration completed: {inserted_records} records inserted.")

# ==========================================
# PHASE 6: CASH MOVEMENTS (MOVIMIENTOS)
# ==========================================
def migrate_cash_movements(conn):
    print("\n--- Migrating Cash Movements (Movimientos) ---")
    
    movement_files = glob.glob(os.path.join(CSV_DIR, 'MOVIMIENTOS_*.csv'))
    
    if not movement_files:
        print("⚠️ No file matching MOVIMIENTOS_*.csv was found.")
        return
    
    csv_file = movement_files[0]
    print(f"📄 Reading file: {csv_file}")
    
    cursor = conn.cursor()
    inserted_records = 0
    skipped_records = 0
    
    with open(csv_file, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            old_id_str = row['ID'].strip()
            shift_id_str = row['OPERACION_ID'].strip()
            
            if not old_id_str or not shift_id_str:
                skipped_records += 1
                continue
                
            movement_id = int(old_id_str)
            shift_id = int(shift_id_str)
            
            amount = safe_float(row['MONTO'])
            created_at = row['CUANDO_FUE'].strip()
            comments = row['COMENTARIOS'].strip()
            old_type = row['TIPO'].strip().lower()
            
            # --- DATA CLEANING AND TRANSFORMATION ---
            movement_type = 'out' if old_type == 's' else 'in'
            
            # Concept cannot be null. If comments are empty, generate a default concept.
            if comments:
                concept = comments[:50] # Keep it short for the concept field
                description = comments  # Keep full text for description
            else:
                concept = 'Entrada de efectivo' if movement_type == 'in' else 'Salida de efectivo'
                description = None
                
            # --- SQLITE INSERTION ---
            try:
                cursor.execute("""
                    INSERT INTO cash_movements (
                        id, cash_register_shift_id, type, amount, 
                        concept, description, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    movement_id, shift_id, movement_type, amount, 
                    concept, description, created_at
                ))
                inserted_records += 1
            except sqlite3.IntegrityError as e:
                # If a movement points to a shift that wasn't migrated (orphaned record), SQLite will catch it
                print(f"❌ Integrity error inserting movement ID '{movement_id}' (Shift: {shift_id}): {e}")

    conn.commit()
    print(f"✅ Cash Movements migration completed: {inserted_records} records inserted. ({skipped_records} skipped)")

# ==========================================
# MAIN ORCHESTRATOR
# ==========================================
def main():
    print("Starting migration to ChuladaPOS...")
    try:
        # Step 0: Ensure a clean slate
        reset_database()
        
        conn = get_db_connection()
        
        # Execute phases
        migrate_customers(conn)
        migrate_users(conn)
        migrate_categories(conn)
        migrate_products(conn)
        migrate_shifts(conn)
        migrate_cash_movements(conn)
        
        conn.close()
        print("\n🎉 Migration process finished successfully.")
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR DURING MIGRATION: {e}")

if __name__ == "__main__":
    main()
