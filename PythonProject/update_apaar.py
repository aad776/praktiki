import sqlite3

def update_apaar():
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE role='student'")
    student_ids = [row[0] for row in cursor.fetchall()]
    for i, sid in enumerate(student_ids):
        apaar_id = str(100000000000 + i)
        cursor.execute("UPDATE users SET apaar_id=? WHERE id=?", (apaar_id, sid))
    conn.commit()
    print(f"Updated APAAR ID for {len(student_ids)} students")
    conn.close()

if __name__ == "__main__":
    update_apaar()
