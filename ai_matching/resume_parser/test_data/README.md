# Resume Parser Test Data

This directory contains test resumes and their ground truth annotations for accuracy evaluation.

## File Structure

Each resume should have two files:

1. **PDF Resume**: `{name}.pdf` - The actual resume PDF file
2. **Ground Truth**: `{name}_ground_truth.json` - Manually annotated correct values

## Ground Truth Format

```json
{
  "filename": "resume_name.pdf",
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1-555-123-4567",
  "skills": ["Skill1", "Skill2", "Skill3"],
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "duration": "2020-2022",
      "description": "Brief description"
    }
  ]
}
```

## Creating Test Data

### 1. Collect Diverse Resumes

Ensure your test set includes:
- Different formats (single-column, two-column, modern, traditional)
- Various experience levels (junior, mid, senior)
- Different industries (tech, finance, healthcare, etc.)
- International phone formats

### 2. Manual Annotation

For each PDF:
1. Read the resume carefully
2. Extract correct values for each field
3. Create a corresponding `_ground_truth.json` file
4. List ALL skills mentioned in the resume
5. Record ALL work experiences

### 3. Quality Checks

Before evaluation:
- ✅ Verify JSON format is valid
- ✅ Ensure filename matches PDF name
- ✅ Double-check email/phone accuracy
- ✅ Skills should match exact casing from resume
- ✅ Experience durations should use same format (YYYY-YYYY or YYYY-Present)

## Running Evaluation

```bash
cd ..
python evaluator.py --test-dir test_data/ --output results.json
```

## Recommended Test Set Size

- **Minimum**: 10 resumes (for initial testing)
- **Recommended**: 50 resumes (for robust evaluation)
- **Production**: 100+ resumes (for comprehensive validation)

## Tips for High-Quality Ground Truth

1. **Skills**: Include exact variations as they appear (e.g., "React.js" vs "React")
2. **Phone**: Preserve original formatting
3. **Experience**: If years not clear, use month-year format
4. **Edge Cases**: Include resumes with:
   - Multiple phone numbers (use the primary one)
   - Multiple emails (use the primary one)
   - Career gaps
   - Freelance/consulting experience
   - International formatting

## Example Files

- `sample_resume_ground_truth.json` - Template ground truth file
- Add your own test resumes here

## Notes

- All ground truth files MUST use UTF-8 encoding
- Ensure consistency in skill naming across all files
- Update this README if you add new annotation fields
