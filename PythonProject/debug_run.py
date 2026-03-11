
try:
    from main import app
    print("Main app imported successfully")
except Exception as e:
    import traceback
    traceback.print_exc()
