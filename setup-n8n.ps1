# Quick setup script for N8N integration
Write-Host "Setting up InstaCreatorX with N8N..." -ForegroundColor Green

# Set environment variables for this session
$env:VITE_N8N_WEBHOOK_BASE = "https://n8n.srv811212.hstgr.cloud/webhook-test"
$env:VITE_N8N_WEBHOOK_ID = "91fcc006-c04e-463a-8acf-7c60577eb5ef"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "  VITE_N8N_WEBHOOK_BASE: $env:VITE_N8N_WEBHOOK_BASE" -ForegroundColor Cyan
Write-Host "  VITE_N8N_WEBHOOK_ID: $env:VITE_N8N_WEBHOOK_ID" -ForegroundColor Cyan

Write-Host "`nStarting development server..." -ForegroundColor Green
npm run dev
