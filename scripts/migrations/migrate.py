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
# PHASE 1.1: USERS
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
        
        conn.close()
        print("\n🎉 Migration process finished successfully.")
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR DURING MIGRATION: {e}")

if __name__ == "__main__":
    main()
    