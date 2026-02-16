
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), '..')))

try:
    from sentence_transformers import CrossEncoder
    print("✅ sentence_transformers is installed!")
    
    model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    student_text = "Python developer with experience in React and FastAPI"
    internship_text = "Looking for a backend intern with Python and SQL knowledge"
    
    score = model.predict([(student_text, internship_text)])[0]
    print(f"✅ Cross-Encoder Score: {score}")
except ImportError as e:
    print(f"❌ Error: {e}")
except Exception as e:
    print(f"❌ An unexpected error occurred: {e}")
