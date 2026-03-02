#!/bin/bash

echo "Starting Smart Travel Application..."
echo ""

echo "Starting Backend Server..."
cd backend
uvicorn main:app --reload &
BACKEND_PID=$!

sleep 3

echo "Starting Frontend Server..."
cd ../frontend
python gradio_app.py &
FRONTEND_PID=$!

echo ""
echo "Both servers are starting..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:7860"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait

