#!/bin/bash

# Path to the python interpreter in the virtual environment
PYTHON_BIN=".venv/bin/python"

# Path to the dev server script
DEV_SERVER="src/http_app/dev_server.py"

# Check if the dev server is already running
if pgrep -f "$DEV_SERVER" > /dev/null; then
    echo "dev_server is already running."
else
    # Check if the python environment exists and is executable
    if [ -x "$PYTHON_BIN" ]; then
        echo "Starting dev_server..."
        $PYTHON_BIN $DEV_SERVER > /dev/null 2>&1 &
        echo "dev_server started."
    else
        echo "Error: Python environment in .venv/ not found or not executable! Please set it up first."
        exit 1
    fi
fi
