TAXES = 0
LOT_SIZE = {'BANKNIFTY': 30, 'FINNIFTY': 25, 'NIFTY': 75, 'MIDCPNIFTY': 50, 'BANKEX': 15, 'SENSEX': 20, 'ZINC': 5, 'SILVERM': 5, 'SILVER': 30, 'NATURALGAS': 1250, 'NATGASMINI': 250, 'GOLDM': 100, 'GOLD': 1, 'CRUDEOILM': 10, 'CRUDEOIL': 100, 'COPPER': 2500, 'SPX': 100, 'SPY': 100, 'QQQ': 100}
VALID_TRADING_WEEKDAYS = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]
VALID_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
]
TRAIL_COST_RE_ENTRY = False
FIXED_VALUE_FOR_DYNAMIC_FACTOR = {}

# BT_URII = {
#     "tick": "http://127.0.0.1:5000/backtest/start", # nse bse
#     "tick": "http://127.0.0.1:5000/backtest/start", # mcx
#     "minute": "http://127.0.0.1:5000/backtest/start"
# }

BT_URII = {
    "tick": "http://localhost:5000/backtest/start", # nse bse
    # "tick": "http://192.168.173.122:5000/backtest/start", # mcx
    "minute": "http://localhost:5000/backtest/start"
}
VERSION_NO = {
    "TV": "29 Mar 25 (1.0.0)", 
    "PORTFOLIO": "15 Feb 25 (1.0.0)", 
    "FRONTEND": "22 Jan 25 (1.0.0)", 
    "FRONTENDTV": "22 Jan 25 (1.0.0)"
}

INPUT_FILE_FOLDER = "INPUT SHEETS"
PORTFOLIO_FILE_PATH = "INPUT PORTFOLIO.xlsx"
TV_FILE_PATH = "INPUT_TV_3_INDICES.xlsx"
LOG_FILE_FOLDER = "Logs"

# Database Configuration
MYSQL_HOST = "106.51.63.60"
MYSQL_USER = "mahesh"
MYSQL_PASSWORD = "mahesh_123"
MYSQL_DATABASE = "historicaldb"

# ----- Runtime Optimization Toggles (Story 6.1) -----
# These defaults preserve current behavior. Environment variables take precedence.
# Effective toggle set and precedence are logged via get_effective_toggles().

DEFAULT_OPT_TOGGLES = {
    # Overall optimization level (string or int). "0" means off/baseline
    "GPU_OPT_LEVEL": "0",
    # Drawdown accumulation optimization gate (0/1). Default OFF
    "GPU_OPT_DRAWDOWN_ACCUM": "0",
    # Prefer cuDF path when available (0/1). Default OFF
    "USE_CUDF": "0",
    # Enable GPU Direct Storage when available (0/1). Default OFF
    "USE_GDS": "0",
    # Row-group size for Parquet streaming (safe default)
    "ROWGROUP_ROWS": "1000000",
    # Max CUDA streams to overlap H2D/compute (safe default)
    "MAX_STREAMS": "2",
    # Parallel backend selection: "threads" | "processes" | "ray" (default empty = existing behavior)
    "PARALLEL_BACKEND": "",
    # Max workers hint; empty means use existing behavior
    "MAX_WORKERS": "",
    # Indicators optimization gates (8.2)
    "GPU_OPT_SMA_CUMSUM": "0",
    "GPU_OPT_STD_CUMSUM": "0",
    # EMA scan optimization and MACD fusion (8.3)
    "GPU_OPT_EMA_SCAN": "0",
    "GPU_OPT_MACD_FUSION": "0",
    # Prefer cuDF rolling operations for SMA/STD when available (8.4)
    "GPU_OPT_CUDF_ROLLING": "0",
    # Memory pool limit in bytes (9.4), default empty = use default
    "GPU_POOL_LIMIT_BYTES": "",
    # Arrow CUDA buffers path (9.3)
    "USE_ARROW_CUDA": "0",
    # SoA layout preference for OHLC/indicator arrays (9.2)
    "GPU_OPT_SOA_LAYOUT": "0",
    # --- Parallel Policy (auto-selection) ---
    # Enable smart policy to select backend/workers based on workload
    "PARALLEL_POLICY_AUTO": "1",
    # If number of strategies >= threshold -> prefer processes; else threads
    "PROCESS_STRATEGY_THRESHOLD": "30",
    # Default workers when using processes backend (auto policy)
    "PROCESS_DEFAULT_WORKERS": "8",
    # Default workers when using threads backend (auto policy)
    "THREAD_DEFAULT_WORKERS": "6",
    # --- Performance Guard (Story 6.4) ---
    # Enable performance regression guard (0/1). Default OFF
    "ENABLE_PERF_GUARD": "0",
    # --- Story 7.2: Streaming and Memory Management ---
    # Enable streaming path for row-group chunking (0/1). Default OFF
    "STREAMING_ENABLED": "0",
    # Target chunk size in MB for streaming
    "GPU_CHUNK_SIZE_MB": "512",
    # Max GPU memory usage percentage
    "GPU_MEMORY_LIMIT_PCT": "80",
    # Number of pinned memory buffers for double-buffering
    "PINNED_MEMORY_POOLS": "2",
    # Enable compute/transfer overlap (0/1). Default OFF
    "H2D_OVERLAP_ENABLED": "0",
    # Number of row-groups to prefetch
    "ROWGROUP_PREFETCH": "2",
    # Number of CUDA streams for parallelism
    "STREAM_CONCURRENCY": "2",
    # --- Story 7.3: GDS/UVM Auto-detect ---
    # Enable Unified Virtual Memory when available (0/1). Default OFF
    "USE_UVM": "0",
    # I/O path preference order (comma-separated)
    "IO_PATH_PREFERENCE": "gds,uvm,standard",
    # Capability detection cache TTL in seconds
    "CAPABILITY_CACHE_TTL": "3600",
    # Direct I/O transfer size for GDS (hint in MB)
    "GDS_DIRECT_IO_SIZE_MB": "256",
    # Number of pages to prefetch in UVM (hint)
    "UVM_PREFETCH_PAGES": "1024",
    # --- Story 7.5: Dataset Scanner with Partition Pruning ---
    # Enable partition-aware data scanning (0/1). Default ON
    "PARTITION_SCANNING_ENABLED": "1",
    # Expected partition columns (comma-separated)
    "PARTITION_SCHEMA": "year,month,day",
    # Cache partition metadata (0/1). Default ON
    "PARTITION_CACHE_ENABLED": "1",
    # Metadata cache TTL in seconds
    "PARTITION_CACHE_TTL": "3600",
    # Minimum fraction to skip for pruning to be beneficial
    "MIN_PRUNING_BENEFIT": "0.3",
    # Parallel partition discovery (0/1). Default ON
    "PARALLEL_PARTITION_DISCOVERY": "1",
    # Enable dataset scanner for Arrow dataset API (0/1/arrow). Default OFF
    "DATASET_SCANNER": "0",
}


def _coerce_value(key: str, value: str) -> object:
    """Coerce env string values to appropriate Python types per key."""
    k = key.upper()
    v = value
    if k in {"GPU_OPT_LEVEL", "ROWGROUP_ROWS", "MAX_STREAMS", "MAX_WORKERS",
             "GPU_POOL_LIMIT_BYTES", "PROCESS_STRATEGY_THRESHOLD", "PROCESS_DEFAULT_WORKERS", "THREAD_DEFAULT_WORKERS",
             "GPU_CHUNK_SIZE_MB", "GPU_MEMORY_LIMIT_PCT", "PINNED_MEMORY_POOLS", "ROWGROUP_PREFETCH", "STREAM_CONCURRENCY",
             "CAPABILITY_CACHE_TTL", "GDS_DIRECT_IO_SIZE_MB", "UVM_PREFETCH_PAGES", "PARTITION_CACHE_TTL"}:
        try:
            # Allow blank value to represent "not set"
            return int(v) if str(v).strip() != "" else ""
        except Exception:
            return DEFAULT_OPT_TOGGLES.get(k, v)
    if k in {"GPU_OPT_DRAWDOWN_ACCUM", "USE_CUDF", "USE_GDS",
             "GPU_OPT_SMA_CUMSUM", "GPU_OPT_STD_CUMSUM",
             "GPU_OPT_EMA_SCAN", "GPU_OPT_MACD_FUSION",
             "GPU_OPT_CUDF_ROLLING", "USE_ARROW_CUDA", "GPU_OPT_SOA_LAYOUT",
             "PARALLEL_POLICY_AUTO", "ENABLE_PERF_GUARD",
             "STREAMING_ENABLED", "H2D_OVERLAP_ENABLED", "USE_UVM",
             "PARTITION_SCANNING_ENABLED", "PARTITION_CACHE_ENABLED", "PARALLEL_PARTITION_DISCOVERY"}:
        s = str(v).strip().lower()
        return "1" if s in {"1", "true", "yes", "on"} else "0"
    if k in {"MIN_PRUNING_BENEFIT"}:
        try:
            return float(v) if str(v).strip() != "" else DEFAULT_OPT_TOGGLES.get(k, v)
        except Exception:
            return DEFAULT_OPT_TOGGLES.get(k, v)
    # Strings
    return str(v)


def get_effective_toggles(logger=None) -> dict:
    """
    Compute effective runtime toggles using environment overrides with precedence:
    env > file defaults. Logs both sources and resolved values.
    """
    import os as _os
    import json as _json

    effective = {}
    sources = {}

    for k, default_v in DEFAULT_OPT_TOGGLES.items():
        env_v = _os.environ.get(k)
        if env_v is not None:
            effective[k] = _coerce_value(k, env_v)
            sources[k] = "env"
        else:
            effective[k] = _coerce_value(k, default_v)
            sources[k] = "default"

    # Prepare a compact log payload that is human-readable
    payload = {
        "precedence": "env_overrides_file_defaults",
        "defaults": DEFAULT_OPT_TOGGLES,
        "effective": effective,
        "source": sources,
    }

    if logger is not None:
        try:
            logger.info(f"Runtime toggles resolved (precedence env > defaults): {_json.dumps(payload, ensure_ascii=False)}")
        except Exception:
            # Fallback to print without breaking execution
            print("Runtime toggles resolved (precedence env > defaults):", payload)
    else:
        # Fallback logging if no logger provided
        print("Runtime toggles resolved (precedence env > defaults):", payload)

    return effective

# ----- End Runtime Optimization Toggles -----
