#!/bin/bash

# Define process patterns
DEV_SERVER="src/http_app/dev_server.py"
MCP_SERVER="src/mcp_server.py"

echo "Checking for running servers..."

# Function to stop process by pattern
stop_process() {
    local pattern=$1
    local name=$2
    
    # Use pgrep -f to find exact match
    # Exclude grep, self script, and other non-relevant matches if any (though pgrep is clean)
    pids=$(pgrep -f "$pattern")
    
    if [ -n "$pids" ]; then
        echo "Found $name PID(s): $pids"
        echo "Stopping $name..."
        pkill -f "$pattern"
        
        # Wait up to 5 seconds to confirm it's stopped
        for i in {1..5}; do
            if ! pgrep -f "$pattern" > /dev/null; then
                echo "$name stopped successfully."
                return 0
            fi
            sleep 1
        done
        
        # If still running, force kill
        if pgrep -f "$pattern" > /dev/null; then
            echo "Warning: $name did not stop gracefully. Force killing..."
            pkill -9 -f "$pattern"
            if ! pgrep -f "$pattern" > /dev/null; then
                echo "$name force killed."
            else
                echo "Error: Failed to kill $name."
                return 1
            fi
        fi
    else
        echo "$name is not running."
    fi
    return 0
}

# Stop dev server
stop_process "$DEV_SERVER" "dev_server"

# Stop MCP server
stop_process "$MCP_SERVER" "mcp_server"

echo "Done."
