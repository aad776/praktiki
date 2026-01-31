from collections import Counter

# In-memory counters (v1)
rejection_reasons = Counter()
matched_skills_counter = Counter()


def record_rejection(reasons):
    for reason in reasons:
        rejection_reasons[reason] += 1


def record_matched_skills(skills):
    for skill in skills:
        matched_skills_counter[skill] += 1


def get_metrics_snapshot():
    return {
        "top_rejection_reasons": rejection_reasons.most_common(5),
        "top_matched_skills": matched_skills_counter.most_common(5)
    }
