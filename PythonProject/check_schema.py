import sqlite3
import os

db_path = 'test.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(student_profiles)")
    columns = cursor.fetchall()
    print("Columns in student_profiles:")
    for col in columns:
        print(col[1])
    conn.close()
else:
    print(f"{db_path} not found")
