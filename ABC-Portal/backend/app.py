import sys
import os

# Ensure the project root is in python path so imports work correctly
# This allows running 'python backend/app.py' or 'python app.py' from inside backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

if __name__ == "__main__":
    import uvicorn
    # Reload=True helps in development to see changes immediately
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
