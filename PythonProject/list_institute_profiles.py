import sqlite3

def list_institute_profiles():
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ip.institute_name, u.email 
        FROM institute_profiles ip
        JOIN users u ON ip.user_id = u.id
    """)
    profiles = cursor.fetchall()
    print("Institute Profiles:")
    for profile in profiles:
        print(f"Name: {profile[0]}, User Email: {profile[1]}")
    conn.close()

if __name__ == "__main__":
    list_institute_profiles()
