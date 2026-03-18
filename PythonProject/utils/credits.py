def calculate_credits(hours: int, policy: str) -> float:
    """
    Calculates internship credits based on hours and policy.
    UGC: 1 credit per 30 hours
    AICTE: 1 credit per 40 hours
    """
    if not hours:
        return 0.0
        
    if policy.upper() == "UGC":
        return round(hours / 30.0, 2)
    elif policy.upper() == "AICTE":
        return round(hours / 40.0, 2)
    else:
        # Default to AICTE as per user instruction (1 credit / 40 hours)
        return round(hours / 40.0, 2)
