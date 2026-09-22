@echo off
cd /d "%~dp0"
if exist sas-config.txt (
  copy /Y sas-config.txt .env >nul
  del sas-config.txt
  echo .env thik kora holo.
)
echo [1/3] Database table banano...
call npx prisma migrate dev --name sas_erp_v1
if errorlevel 1 goto fail
echo [2/3] Default dam ar Super Admin...
call npx prisma db seed
if errorlevel 1 goto fail
echo [3/3] Server chalu hocche...
call npm run dev
goto end
:fail
echo.
echo ERROR hoyeche. Upore er lekha copy kore Claude ke pathan.
pause
:end
