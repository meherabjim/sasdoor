# SAS DOOR backend setup (Windows PowerShell)
# Run from inside the sasdoor-backend folder:  powershell -ExecutionPolicy Bypass -File .\setup.ps1
$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host ""
  Write-Host ".env file banano holo. Notepad e khule DATABASE_URL, JWT_SECRET, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD thik korun." -ForegroundColor Yellow
  notepad .env
  Read-Host "Save kore Enter chapun"
}

Write-Host "1/3 Package install..." -ForegroundColor Cyan
npm install

Write-Host "2/3 Database table banano..." -ForegroundColor Cyan
npx prisma migrate dev --name sas_erp_v1

Write-Host "3/3 Default dam ar Super Admin boshano..." -ForegroundColor Cyan
npx prisma db seed

Write-Host ""
Write-Host "Shesh! Server chalate:  npm run dev" -ForegroundColor Green
