# Silent Palms Command Center — Quick Start
# Run: .\start.ps1

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Silent Palms Command Center — Starting Up" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check .env
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[!] Created .env from template — please fill in DATABASE_URL and ANTHROPIC_API_KEY" -ForegroundColor Yellow
    exit
}

# Backend: migrate + seed + start
Write-Host "`n[1/3] Setting up database..." -ForegroundColor Green
Set-Location backend
$env:NODE_ENV = "development"
npx prisma generate
npx prisma migrate deploy
npx ts-node src/seed.ts
Write-Host "[1/3] Database ready!" -ForegroundColor Green

# Start backend in background
Write-Host "`n[2/3] Starting API server on port 4000..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "npx" -ArgumentList "ts-node-dev --respawn --transpile-only src/index.ts" -PassThru | Out-Null
Start-Sleep -Seconds 3
Write-Host "[2/3] API server started!" -ForegroundColor Green

# Start frontend
Set-Location ..\frontend
Write-Host "`n[3/3] Starting frontend on port 3000..." -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  App: http://localhost:3000" -ForegroundColor White
Write-Host "  API: http://localhost:4000/health" -ForegroundColor White
Write-Host "  Login: admin@silentpalms.com" -ForegroundColor White
Write-Host "  Password: Admin@SilentPalms2024" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Cyan
npx next dev
