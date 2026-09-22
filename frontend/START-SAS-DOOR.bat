@echo off
echo Starting SAS DOOR...
start "SAS DOOR Backend" cmd /k "cd /d F:\sasdoor-backend && npm run dev"
timeout /t 5 /nobreak >nul
start "SAS DOOR Frontend" cmd /k "cd /d F:\sasdoorbd && npm run dev"
timeout /t 12 /nobreak >nul
start http://localhost:3000/login
