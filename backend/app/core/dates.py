from datetime import datetime

def weekday_from_yyyy_mm_dd(date_str: str) -> int:
    # Mon=0 .. Sun=6 (Python style)
    return datetime.strptime(date_str, "%Y-%m-%d").weekday()
