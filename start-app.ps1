# InstaCreatorX Startup Script
# Dieses Script setzt den PATH und startet die App

Write-Host "Setting up Node.js PATH..." -ForegroundColor Yellow
$env:PATH += ";C:\Program Files\nodejs"

Write-Host "Starting InstaCreatorX Development Server..." -ForegroundColor Green
npm run dev
