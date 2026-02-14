
def calculate_credits(hours: int, policy: str) -> float:
    """
    Calculate credits based on hours worked and policy.
    UGC: 30 hours = 1 credit
    AICTE: 40 hours = 1 credit
    Returns float rounded to 2 decimal places.
    """
    if not policy:
        raise ValueError("Policy is required")
        
    policy = policy.upper()
    
    if policy == "UGC":
        return round(hours / 30.0, 2)
    elif policy == "AICTE":
        return round(hours / 40.0, 2)
    else:
        # Default fallback or error
        raise ValueError(f"Unknown policy: {policy}")

