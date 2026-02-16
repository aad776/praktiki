# Production Accuracy Monitoring Guide

## 🎯 Overview

Three methods to measure model accuracy in production:

1. **Offline Evaluation** - Test on labeled dataset
2. **Real-time Monitoring** - Track metrics during production
3. **Human Feedback Loop** - Collect corrections from users

---

## Method 1: Offline Evaluation (Before Deployment)

### Step 1: Create Test Dataset

Create 10-50 diverse resumes in `test_data/` directory:

```bash
test_data/
├── resume1.pdf
├── resume1_ground_truth.json
├── resume2.pdf
├── resume2_ground_truth.json
...
```

**Ground Truth Format:**
```json
{
  "filename": "resume1.pdf",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4567",
  "skills": ["Python", "FastAPI", "Docker"],
  "experience": [
    {
      "company": "Tech Corp",
      "position": "Software Engineer",
      "duration": "2020-2022"
    }
  ]
}
```

### Step 2: Run Evaluator

```bash
python evaluator.py --test-dir test_data --output evaluation_results.json
```

**Output:**
```
============================================================
RESUME PARSER EVALUATION RESULTS
============================================================

📊 Overall Accuracy: 92.50%
📝 Total Resumes Evaluated: 10

NAME:       Accuracy: 95.00%
EMAIL:      Accuracy: 100.00%
PHONE:      Accuracy: 88.00%
SKILLS:     Accuracy: 91.00%
EXPERIENCE: Accuracy: 89.00%
============================================================
```

---

## Method 2: Real-time Production Monitoring

### New Endpoints Added

Your API now has 3 monitoring endpoints:

#### 1. `GET /metrics` - Current Performance Stats

```bash
curl http://127.0.0.1:8001/metrics
```

**Response:**
```json
{
  "total_requests": 150,
  "successful_parses": 145,
  "failed_parses": 5,
  "success_rate": 0.9667,
  "avg_processing_time_ms": 1234.56,
  "median_processing_time_ms": 1150.23,
  "extraction_rates": {
    "name_rate": 0.95,
    "email_rate": 0.98,
    "phone_rate": 0.87,
    "skills_rate": 0.92,
    "experience_rate": 0.88
  },
  "avg_confidence_score": 0.89
}
```

**What it shows:**
- **Success rate**: % of resumes parsed without errors
- **Processing time**: Performance metrics
- **Extraction rates**: % of resumes where each field was found
- **Confidence score**: Average confidence (0-1) across all parses

#### 2. `POST /feedback` - Submit Human Corrections

```bash
curl -X POST http://127.0.0.1:8001/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "john_doe.pdf",
    "field": "email",
    "predicted_value": "john@example.com",
    "correct_value": "john.doe@example.com",
    "is_correct": false
  }'
```

**Use cases:**
- User reports incorrect extraction
- Manual review process
- Quality assurance checks

#### 3. `GET /accuracy` - Calculate Accuracy from Feedback

```bash
curl http://127.0.0.1:8001/accuracy
```

**Response:**
```json
{
  "name_accuracy": 0.95,
  "name_total_samples": 20,
  "email_accuracy": 0.98,
  "email_total_samples": 20,
  "phone_accuracy": 0.85,
  "phone_total_samples": 18,
  "skills_accuracy": 0.91,
  "skills_total_samples": 19,
  "overall_accuracy": 0.92,
  "total_feedback_samples": 77
}
```

---

## Method 3: Production Logging

### Automatic Logging

Every parse request is automatically logged to `logs/` directory:

```
logs/
├── parse_log_2026-02-16.jsonl     # Daily parsing logs
├── human_feedback.jsonl            # User corrections
```

**Parse Log Format:**
```json
{
  "timestamp": "2026-02-16T12:00:00",
  "filename": "resume.pdf",
  "success": true,
  "processing_time_ms": 1234.56,
  "extracted_fields": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-1234",
    "num_skills": 8,
    "num_experience": 2
  }
}
```

### Analyze Logs

```python
import json
from pathlib import Path

# Load today's logs
log_file = Path("logs/parse_log_2026-02-16.jsonl")

total = 0
successful = 0
extraction_counts = {"name": 0, "email": 0, "phone": 0}

with open(log_file) as f:
    for line in f:
        entry = json.loads(line)
        total += 1
        
        if entry["success"]:
            successful += 1
            fields = entry["extracted_fields"]
            if fields["name"]: extraction_counts["name"] += 1
            if fields["email"]: extraction_counts["email"] += 1
            if fields["phone"]: extraction_counts["phone"] += 1

print(f"Success rate: {successful/total:.2%}")
print(f"Name extraction: {extraction_counts['name']/successful:.2%}")
print(f"Email extraction: {extraction_counts['email']/successful:.2%}")
```

---

## 🔄 Continuous Accuracy Improvement Workflow

### Week 1: Baseline Evaluation
1. Run offline evaluation on 50 test resumes
2. Identify weak fields (< 90% accuracy)
3. Deploy to production with monitoring enabled

### Week 2-4: Production Monitoring
1. **Monitor `/metrics` daily**
   ```bash
   curl http://127.0.0.1:8001/metrics > daily_metrics_$(date +%Y%m%d).json
   ```

2. **Collect human feedback**
   - When users report errors, call `/feedback` endpoint
   - Target: 100+ feedback samples

3. **Calculate real accuracy**
   ```bash
   curl http://127.0.0.1:8001/accuracy
   ```

### Month 2+: Iterative Improvement
1. **Analyze feedback patterns**
   ```python
   # Find common errors
   import json
   from collections import Counter
   
   errors = []
   with open("logs/human_feedback.jsonl") as f:
       for line in f:
           entry = json.loads(line)
           if not entry["is_correct"]:
               errors.append(entry["field"])
   
   print(Counter(errors))  # Which fields have most errors?
   ```

2. **Apply targeted fixes**
   - If phone errors high → improve regex patterns
   - If skills errors high → expand skill taxonomy
   - If name errors high → add custom spaCy rules

3. **Re-evaluate**
   ```bash
   python evaluator.py --test-dir test_data --output results_v2.json
   ```

4. **A/B test improvements**
   - Deploy improved version
   - Compare metrics before/after
   - Aim for 1-2% accuracy improvement per iteration

---

## 📊 Dashboard Example (Optional)

Create a simple accuracy dashboard:

```python
# dashboard.py
import streamlit as st
import json
from pathlib import Path

st.title("Resume Parser Accuracy Dashboard")

# Load latest metrics
metrics = requests.get("http://127.0.0.1:8001/metrics").json()

# Display KPIs
col1, col2, col3 = st.columns(3)
col1.metric("Success Rate", f"{metrics['success_rate']:.1%}")
col2.metric("Avg Processing Time", f"{metrics['avg_processing_time_ms']:.0f}ms")
col3.metric("Total Requests", metrics['total_requests'])

# Extraction rates
st.subheader("Field Extraction Rates")
rates = metrics['extraction_rates']
st.bar_chart(rates)

# Accuracy from feedback
accuracy = requests.get("http://127.0.0.1:8001/accuracy").json()
st.subheader("Accuracy (from Human Feedback)")
st.metric("Overall Accuracy", f"{accuracy.get('overall_accuracy', 0):.1%}")
```

Run with: `streamlit run dashboard.py`

---

## 🎯 Target Metrics

| Metric | Development | Production Target |
|--------|------------|------------------|
| Overall Accuracy | >90% | >92% (after feedback) |
| Name Extraction | >95% | >97% |
| Email Extraction | >98% | >99% |
| Phone Extraction | >85% | >90% |
| Skills F1 Score | >90% | >93% |
| Success Rate | - | >95% |
| Avg Processing Time | <2s | <1.5s |

---

## 🚨 Alerts & Monitoring

Set up alerts for production issues:

```python
# monitor_alerts.py
import requests
import time

while True:
    metrics = requests.get("http://127.0.0.1:8001/metrics").json()
    
    # Alert: Low success rate
    if metrics.get('success_rate', 1.0) < 0.90:
        print("🚨 ALERT: Success rate dropped below 90%!")
        # Send email/Slack notification
    
    # Alert: High processing time
    if metrics.get('avg_processing_time_ms', 0) > 3000:
        print("🚨 ALERT: Processing time > 3 seconds!")
    
    # Alert: Low extraction rates
    rates = metrics.get('extraction_rates', {})
    for field, rate in rates.items():
        if rate < 0.85:
            print(f"⚠️  WARNING: {field} extraction rate = {rate:.1%}")
    
    time.sleep(300)  # Check every 5 minutes
```

---

## Summary

**3 Ways to Track Accuracy:**

1. ✅ **Offline**: `python evaluator.py --test-dir test_data`
2. ✅ **Real-time**: `GET /metrics` endpoint
3. ✅ **Feedback-based**: `/feedback` + `GET /accuracy` endpoints

**Best Practice:**
- Start with offline evaluation (50+ resumes)
- Deploy with monitoring enabled
- Collect 100+ human feedback samples
- Iterate based on real production data
- Achieve >92% accuracy over time
