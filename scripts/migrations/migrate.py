import csv
import sqlite3
import uuid
import os
import glob

# ==========================================
# CONFIGURATION AND PATHS
# ==========================================
DB_PATH = 'database.db'
CSV_DIR = './' 

# In-Memory Mapping Dictionaries (Old ID -> New UUID)
customer_map = {}
category_map = {}
user_map = {}
product_map = {}
shift_map = {} 
sale_map = {}

def get_db_connection():
    """Creates and returns the SQLite database connection."""
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found at: {DB_PATH}")
    
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
    
    # Search for the CSV file regardless of the timestamp
    customer_files = glob.glob(os.path.join(CSV_DIR, 'CLIENTES_*.csv'))
    
    if not customer_files:
        print("⚠️ No file matching CLIENTES_*.csv was found.")
        return
    
    csv_file = customer_files[0] # Take the first match
    print(f"📄 Reading file: {csv_file}")
    
    cursor = conn.cursor()
    inserted_records = 0
    
    # using utf-8-sig to handle potential BOM (Byte Order Mark) from Windows Excel exports
    with open(csv_file, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            new_uuid = str(uuid.uuid4())
            old_id = row['NUMERO'].strip()
            
            # Data cleaning
            name = row['NOMBRE'].strip()
            address = row['DIRECCION'].strip()
            phone = row['TELEFONO'].strip()
            current_balance = safe_float(row['DSALDOACTUAL'])
            credit_limit = safe_float(row['LIMITE_CREDITO'], 500.0) # 500.0 default from schema
            
            # Save in memory for future phases (e.g., debt_payments and sales)
            customer_map[old_id] = new_uuid
            
            # SQLite Insertion
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
# MAIN ORCHESTRATOR
# ==========================================
def main():
    print("Starting migration to ChuladaPOS...")
    try:
        conn = get_db_connection()
        
        # Execute phases
        migrate_customers(conn)
        
        conn.close()
        print("\n🎉 Migration process finished successfully.")
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR DURING MIGRATION: {e}")

if __name__ == "__main__":
    main()
    