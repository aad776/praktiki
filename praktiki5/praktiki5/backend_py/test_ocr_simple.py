
import pytesseract
from PIL import Image
import os

def test_ocr():
    upload_dir = "uploads"
    files = [f for f in os.listdir(upload_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
    if not files:
        print("No files found")
        return
        
    sample_file = os.path.join(upload_dir, files[0])
    print(f"Testing OCR on: {sample_file}")
    
    try:
        text = pytesseract.image_to_string(Image.open(sample_file))
        print(f"OCR TEXT LENGTH: {len(text)}")
        print("--- TEXT PREVIEW ---")
        print(text[:500])
        print("--------------------")
    except Exception as e:
        print(f"OCR ERROR: {e}")

if __name__ == "__main__":
    test_ocr()
