# Resume Parser API - Quick Start Guide

## 🚀 Setup (5 minutes)

### Prerequisites
- Python 3.8+
- pip

### Installation

```bash
# Navigate to resume_parser directory
cd c:\Users\karti\computer_science\praktiki\PythonProject\resume_parser

# Install dependencies
pip install -r requirements.txt

# Download spaCy model (this takes 2-3 minutes)
python -m spacy download en_core_web_trf
```

---

## ✅ Test 1: Quick Test (No Server)

```bash
# Test on a single PDF without starting the API
python test_parser.py path\to\your\resume.pdf
```

**Expected Output:**
```
===========================================================
RESUME PARSER - Quick Test
===========================================================

📦 Loading models...
✅ Models loaded successfully

📄 Processing: resume.pdf
✅ Extracted 2500 characters

🔍 Extracting entities...
  Name:  John Doe
  Email: john.doe@example.com
  Phone: +1-555-123-4567

💡 Extracting skills...
  Found 12 skills: Python, FastAPI, Docker, AWS, ...

💼 Extracting experience...
  Found 2 experience entries:
    1. Senior Engineer at Tech Corp (2020-Present)
    2. Developer at Startup (2018-2020)

JSON OUTPUT
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "skills": ["Python", "FastAPI", ...],
  ...
}
```

---

## ✅ Test 2: Start API Server

```bash
# Start the FastAPI server
python main.py
```

**Server will start at:** `http://127.0.0.1:8001`

**Access Swagger UI:** http://127.0.0.1:8001/docs

---

## ✅ Test 3: Parse via Swagger UI

1. Open browser: http://127.0.0.1:8001/docs
2. Click **POST /parse**
3. Click **"Try it out"**
4. Click **"Choose File"** and select a PDF resume
5. Click **"Execute"**
6. View JSON response below

---

## ✅ Test 4: Parse via Python

```python
import requests

# Upload and parse
url = "http://127.0.0.1:8001/parse"
files = {"file": open("resume.pdf", "rb")}

response = requests.post(url, files=files)
result = response.json()

# Print results
if result["success"]:
    data = result["data"]
    print(f"Name: {data['name']}")
    print(f"Email: {data['email']}")
    print(f"Skills: {', '.join(data['skills'])}")
else:
    print(f"Error: {result['error']}")
```

---

## ✅ Test 5: Evaluate Accuracy

```bash
# 1. Add test resumes to test_data/
#    - resume1.pdf + resume1_ground_truth.json
#    - resume2.pdf + resume2_ground_truth.json

# 2. Run evaluation
python evaluator.py --test-dir test_data --output results.json

# 3. View metrics
# Expected: >90% overall accuracy
```

---

## 🎯 Expected Accuracy

| Field | Target | Method |
|-------|--------|--------|
| Name | 95%+ | spaCy NER |
| Email | 98%+ | Regex |
| Phone | 85%+ | Regex |
| Skills | 90%+ | Exact + FAISS |
| Experience | 85%+ | Pattern matching |
| **Overall** | **>90%** | Weighted avg |

---

## 📚 Google Colab

**For Colab deployment:**
1. Open `resume_parser_colab.ipynb` in Google Colab
2. Run all cells
3. Upload resume PDF
4. Get parsed results

---

## 🐛 Troubleshooting

### spaCy model not found
```bash
python -m spacy download en_core_web_trf
```

### Port already in use
```bash
# Change port in main.py:
uvicorn.run("main:app", host="0.0.0.0", port=8002)  # Use 8002 instead
```

### PDF extraction fails
- Ensure PDF is not password-protected
- Ensure PDF contains actual text (not scanned image)

---

## 📖 Full Documentation

See [`README.md`](README.md) for:
- Complete API reference
- Optimization strategies (80% → 90%)
- Production deployment guide
- Advanced configuration

---

**Built with ❤️ by the Praktiki Team**
