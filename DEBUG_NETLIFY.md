# 🐛 Netlify 404 Debug Checklist

## Problem: 404 bei `/api/n8n/webhook-test/:id`

### 1. Prüfe ob die Function deployed wurde

Gehe zu Netlify Dashboard:
- **Functions** Tab (im linken Menü)
- Sollte `n8n-proxy` auflisten
- Status sollte "Success" sein

**Falls die Function NICHT angezeigt wird:**
- ❌ TypeScript wurde nicht kompiliert
- ❌ `netlify/functions/` Ordner fehlt

### 2. Prüfe die Environment Variables

Gehe zu: **Site Settings → Environment Variables**

**Müssen gesetzt sein:**
```
VITE_N8N_WEBHOOK_BASE=https://n8n.srv811212.hstgr.cloud
VITE_N8N_WEBHOOK_ID=91fcc006-c04e-463a-8acf-7c60577eb5ef
```

**Falls diese FEHLEN:**
→ Setze sie und triggere einen Redeploy

### 3. Prüfe die Function direkt

Teste die Function direkt (ohne Redirect):

```bash
curl -X POST https://testsercan.netlify.app/.netlify/functions/n8n-proxy?id=91fcc006-c04e-463a-8acf-7c60577eb5ef \
  -H "Content-Type: application/json" \
  -d '{"message":{"text":"test"}}'
```

**Erwartetes Ergebnis:**
- Status 200
- JSON Response von n8n

**Falls 404:**
→ Function wurde nicht deployed

**Falls 500:**
→ Environment Variables fehlen oder n8n nicht erreichbar

### 4. Test im Browser

Öffne direkt:
```
https://testsercan.netlify.app/.netlify/functions/n8n-proxy?id=91fcc006-c04e-463a-8acf-7c60577eb5ef
```

**Erwartetes Ergebnis:**
- "Method not allowed" (wir verwenden POST)
- ODER: Irgendeine Antwort von der Function

**Falls "Page not found":**
→ Function wurde nicht deployed

## 🔧 Lösungen

### Lösung 1: Redeploy triggern

1. Gehe zu: **Deploys** Tab
2. Klicke auf den letzten Deploy
3. Prüfe die Logs auf Fehler
4. Klicke: **Trigger deploy → Deploy site**

### Lösung 2: Environment Variables setzen

1. **Site Settings → Environment Variables**
2. **Add a variable**:
   - Key: `VITE_N8N_WEBHOOK_BASE`
   - Value: `https://n8n.srv811212.hstgr.cloud`
3. **Add a variable**:
   - Key: `VITE_N8N_WEBHOOK_ID`
   - Value: `91fcc006-c04e-463a-8acf-7c60577eb5ef`
4. **Trigger Redeploy**

### Lösung 3: Build Log prüfen

Gehe zu: **Deploys → [Letzter Deploy] → Deploy log**

Suche nach:
```
✓ Functions build successful
```

**Falls NICHT vorhanden:**
→ TypeScript-Fehler oder fehlende Dependencies

**Prüfe auf:**
```
npm ERR!
```

### Lösung 4: netlify.toml verifizieren

Die Datei `netlify.toml` MUSS im Root-Verzeichnis liegen.

**Prüfe den Inhalt:**
```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/n8n/webhook-test/:id"
  to = "/.netlify/functions/n8n-proxy?id=:id"
  status = 200
  force = true
```

## 🎯 Quick Fix

**Falls nichts hilft, versuche:**

1. **Clear cache and redeploy:**
   - Deploys → Trigger deploy → **Clear cache and deploy site**

2. **Check build logs:**
   - Letzter Deploy → Deploy log
   - Scroll runter zu "Functions bundling"
   - Sollte zeigen: `✓ n8n-proxy`

3. **Direkter Function-Test:**
   Öffne: `https://testsercan.netlify.app/.netlify/functions/n8n-proxy`
   - Sollte NICHT 404 sein
   - Sollte "Method not allowed" oder ähnlich zeigen

## 📞 Support

Falls weiterhin 404:
- Teile den Build-Log
- Prüfe ob `netlify/functions/n8n-proxy.ts` im Repository ist
- Prüfe ob `@netlify/functions` in `package.json` steht

