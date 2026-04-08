@echo off
echo ==========================================
echo Starting Personal Finance App (Local Mode)
echo ==========================================

echo Starting Backend Server on Port 5000...
start "Finance Backend" cmd /c "cd finance-backend && npm start"

echo Starting React Frontend on Port 5173...
start "Finance Frontend" cmd /c "cd finance-frontend && npm run dev"

echo.
echo Your app is booting up!
echo The backend is running in the background.
echo Once Vite is ready, you can access your app at: http://localhost:5173
echo.
pause
