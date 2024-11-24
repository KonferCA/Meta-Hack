#!/bin/bash
set -e  # Exit on any error

echo "Starting deployment process..."

# stop any existing uvicorn process
echo "Stopping existing server..."
pkill -f uvicorn || true

# activate virtual environment or create if it doesn't exist
echo "Setting up virtual environment..."
if [ ! -d "venv" ]; then
    echo "Creating new virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate

# install requirements
echo "Installing dependencies..."
pip install -r requirements.txt

# remove existing database
echo "Removing existing database..."
rm -f sql_app.db

# create or update .env file
echo "Creating/updating .env file..."
cat > .env << EOL
SECRET_KEY="your-secret-key-here"
GROQ_API_KEY="${GROQ_API_KEY}"
USE_GROQ=true
EOL

# set environment variables
export SECRET_KEY="your-secret-key-here"
export GROQ_API_KEY="${GROQ_API_KEY}"
export USE_GROQ=true

# start the server in the background
echo "Starting server..."
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > server.log 2>&1 &

# wait and check server status
echo "Waiting for server to start..."
sleep 5

# check server logs for errors
if grep -i "error" server.log; then
    echo "Found errors in server log:"
    cat server.log
    exit 1
fi

# check if server is running
if ! pgrep -f uvicorn > /dev/null; then
    echo "Server failed to start. Server logs:"
    cat server.log
    exit 1
fi

# check if server is responding
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "Server is not responding. Server logs:"
    cat server.log
    exit 1
fi

echo "Server started successfully!" 