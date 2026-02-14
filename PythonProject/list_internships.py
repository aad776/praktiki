import sqlite3

def list_internships():
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT i.id, i.title, ep.company_name 
        FROM internships i 
        JOIN employer_profiles ep ON i.employer_id = ep.id
    """)
    internships = cursor.fetchall()
    print("Internships:")
    for i in internships:
        print(f"ID: {i[0]}, Title: {i[1]}, Company: {i[2]}")
    conn.close()

if __name__ == "__main__":
    list_internships()
