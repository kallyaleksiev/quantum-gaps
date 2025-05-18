#!/bin/bash

# congure AI
# export ANTHROPIC_API_KEY=...
# export OPENAI_API_KEY=...
# export BING_API_KEY=...

# configure logfire 
export LOGFIRE_CONSOLE=false
# export LOGFIRE_TOKEN=$LOGFIRE_TOKEN

# configure concurrency 
export QGC_MAX_CONCURRENT_PAGES=4
export QGC_MAX_CONCURRENT_CATEGORIES=2

# configure the starting point  
export QGC_START_CATEGORY='Algorithms'

# configure the output directory 
export QGC_OUTPUT_DIR="./results/outputs/pickle/new"

# configure timeout
export QGC_REQUEST_TIMEOUT=60

# run
uv run python -u examples/run_procedure_from_checkpoint.py
