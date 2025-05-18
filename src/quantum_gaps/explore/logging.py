import logfire
from tqdm import tqdm


# Create a tqdm-compatible logger
def tqdm_safe_log(msg: str, level="info"):
    """Log without disturbing the progress bar by using tqdm.write"""
    level_func = getattr(logfire, level)
    # Capture the log message but write it using tqdm
    tqdm.write(f"[{level.upper()}] {msg}")
    # Also log normally for file logging
    level_func(msg)
