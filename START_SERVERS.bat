@echo off
echo Starting Smart Travel Application...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && uvicorn main:app --reload"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && python gradio_app.py"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:7860
echo.
echo Press any key to exit (servers will keep running)...
pause >nul

