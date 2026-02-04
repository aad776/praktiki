import sqlite3

# Read the SQL script
with open('seed_internships.sql', 'r') as f:
    sql_script = f.read()

# Connect to the database
conn = sqlite3.connect('test.db')
cursor = conn.cursor()

# Execute the SQL script
try:
    cursor.executescript(sql_script)
    conn.commit()
    print("SQL script executed successfully!")
except Exception as e:
    print(f"Error executing SQL script: {e}")
    conn.rollback()
finally:
    # Close the connection
    conn.close()