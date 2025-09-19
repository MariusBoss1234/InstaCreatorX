# N8N Deployment Guide

- Required environment variables:
  - VITE_N8N_WEBHOOK_BASE (your n8n webhook URL)
  - VITE_N8N_WEBHOOK_ID (webhook ID from your n8n workflow)

## Architecture
```
Frontend (Vite) → n8n Webhook → AI APIs → Response
```

## Local development
1. Install deps:
   ```powershell
   npm install
   ```
2. Set env variables:
   ```powershell
   # For your production n8n instance
   $env:VITE_N8N_WEBHOOK_BASE = "https://n8n.srv811212.hstgr.cloud/webhook-test"
   $env:VITE_N8N_WEBHOOK_ID = "91fcc006-c04e-463a-8acf-7c60577eb5ef"
   npm run dev
   ```
3. Open http://localhost:5173 (Vite dev server)

## Production deployment (Static Frontend Only)
```powershell
npm run build
```
Deploy `dist` folder to:
- **Netlify**: Connect Git repo, set environment variables in dashboard
- **Vercel**: Import project, add environment variables
- **GitHub Pages**: Use GitHub Actions with env secrets

## N8N Setup
1. **Self-hosted**: Install n8n and import the workflow JSON
2. **n8n.cloud**: Create account and import workflow
3. **Configure APIs**: Set OpenAI/OpenRouter credentials in n8n
4. **Get webhook URL**: Copy from n8n webhook node

## Environment Variables (Platform Dashboard)
```
VITE_N8N_WEBHOOK_BASE=https://n8n.srv811212.hstgr.cloud/webhook-test
VITE_N8N_WEBHOOK_ID=91fcc006-c04e-463a-8acf-7c60577eb5ef
```

## Benefits of N8N Architecture
- ✅ **No backend server** (just static frontend)
- ✅ **Visual workflow editing**
- ✅ **Built-in AI integrations**
- ✅ **Automatic scaling**
- ✅ **Easy deployment** (any static host)

## Migration Notes
- Server directory removed
- Express API calls replaced with n8n webhooks
- File uploads handled via n8n multipart processing
- State management moved to frontend (localStorage/indexedDB)
