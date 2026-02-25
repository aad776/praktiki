
from sqlalchemy import create_engine, inspect
import sys
import os

DATABASE_URL = "sqlite:///../PythonProject/test.db"
engine = create_engine(DATABASE_URL)

def check_columns():
    inspector = inspect(engine)
    columns = inspector.get_columns('credit_requests')
    col_names = [c['name'] for c in columns]
    print(f"Columns in credit_requests: {col_names}")
    
    if 'remarks' in col_names:
        print("remarks column exists.")
    else:
        print("remarks column MISSING.")

if __name__ == "__main__":
    check_columns()
