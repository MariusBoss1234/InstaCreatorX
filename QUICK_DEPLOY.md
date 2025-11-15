# 🚀 Quick Deploy Checklist

Schnelle Anleitung für Netlify-Deployment:

## ✅ Vor dem Deployment

- [ ] Code ist committed und gepusht
- [ ] `netlify.toml` liegt im Root
- [ ] `netlify/functions/n8n-proxy.ts` existiert
- [ ] n8n-Webhook ist aktiv und erreichbar

## 📦 Netlify Setup (einmalig)

1. **Site erstellen**: [Netlify Dashboard](https://app.netlify.com) → "Add new site"
2. **Repository verbinden**: GitHub/GitLab auswählen
3. **Environment Variables setzen**:
   ```
   VITE_N8N_WEBHOOK_BASE=https://n8n.srv811212.hstgr.cloud
   VITE_N8N_WEBHOOK_ID=91fcc006-c04e-463a-8acf-7c60577eb5ef
   ```
4. **Deploy**: Klick auf "Deploy site"

## 🔄 Nach dem Deployment

- [ ] Dependencies installieren: `npm install` (für @netlify/functions)
- [ ] Site URL notieren (z.B. `https://testsercan.netlify.app`)
- [ ] Funktionalität testen:
  - Post-Ideen generieren
  - Bilder generieren
  - Bild-Upload

## 🐛 Troubleshooting

### 404 bei `/api/n8n/...`
→ Prüfe `netlify.toml` und redeploy

### 500 in Function
→ Prüfe Environment Variables in Netlify UI

### Function nicht gefunden
→ Prüfe ob `netlify/functions/n8n-proxy.ts` committed ist

## 📊 Deployment Status prüfen

```bash
# Netlify CLI installieren (optional)
npm install -g netlify-cli

# Status prüfen
netlify status

# Logs anschauen
netlify functions:log n8n-proxy
```

## 🎉 Fertig!

Nach erfolgreichem Deployment:
- Frontend läuft auf Netlify
- Netlify Function proxied zu n8n
- Keine CORS-Probleme mehr ✨

