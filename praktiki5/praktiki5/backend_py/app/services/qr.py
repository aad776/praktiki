import cv2
from pyzbar.pyzbar import decode
from PIL import Image

def scan_qr(file_path: str) -> tuple[bool, str | None]:
    try:
        # Check if file is image
        path_lower = file_path.lower()
        if not path_lower.endswith(('.png', '.jpg', '.jpeg')):
            return False, None
            
        img = cv2.imread(file_path)
        if img is None:
            return False, None
        decoded_objects = decode(img)
        
        if decoded_objects:
            return True, decoded_objects[0].data.decode("utf-8")
        return False, None
    except Exception as e:
        print(f"QR Scan Error: {e}")
        return False, None
