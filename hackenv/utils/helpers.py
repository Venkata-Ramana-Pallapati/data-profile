# utils/helpers.py
import numpy as np

def json_friendly(obj):
    """Convert NumPy types to native Python types for JSON serialization"""
    if isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    if isinstance(obj, (np.ndarray, list, tuple, set)):
        return [json_friendly(v) for v in obj]
    return obj