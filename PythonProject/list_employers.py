import sqlite3

def list_employers():
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.email, ep.company_name 
        FROM users u 
        JOIN employer_profiles ep ON u.id = ep.user_id 
        WHERE u.role='employer'
    """)
    employers = cursor.fetchall()
    print("Employers:")
    for e in employers:
        print(f"Email: {e[0]}, Company: {e[1]}")
    conn.close()

if __name__ == "__main__":
    list_employers()
