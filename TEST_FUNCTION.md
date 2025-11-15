# 🧪 Netlify Function Test

## ✅ Deploy Status: LIVE

Die Function wurde deployed. Jetzt testen wir:

## Test 1: Function erreichbar?

Öffne im Browser:
```
https://testsercan.netlify.app/.netlify/functions/n8n-proxy
```

**Erwartetes Ergebnis:**
- ❌ Nicht mehr "404 Not Found"
- ✅ "Method not allowed" ODER
- ✅ `{"error":"Missing webhook ID parameter"}`

**Falls immer noch 404:**
→ Prüfe Netlify Dashboard → Functions Tab
→ Sollte `n8n-proxy` auflisten

## Test 2: Function mit Parameter

Öffne im Browser:
```
https://testsercan.netlify.app/.netlify/functions/n8n-proxy?id=91fcc006-c04e-463a-8acf-7c60577eb5ef
```

**Erwartetes Ergebnis:**
- `{"error":"Method not allowed"}` (weil wir GET statt POST verwenden)

## Test 3: Richtiger POST-Request

Öffne die Browser-Konsole (F12) und führe aus:
```javascript
fetch('https://testsercan.netlify.app/.netlify/functions/n8n-proxy?id=91fcc006-c04e-463a-8acf-7c60577eb5ef', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: { text: 'test' } })
})
.then(r => r.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
```

**Erwartetes Ergebnis:**
- Falls Environment Variables NICHT gesetzt:
  - `{"success":false,"error":"..."}`
  - ODER: Timeout/Netzwerkfehler
  
- Falls Environment Variables gesetzt:
  - Response von n8n (z.B. Post-Ideen)

## 🔑 WICHTIG: Environment Variables setzen

**BEVOR die App funktioniert, musst du:**

1. [Netlify Dashboard](https://app.netlify.com) öffnen
2. Site "testsercan" auswählen
3. **Site Settings → Environment Variables**
4. **Add a variable** (2x):

```
VITE_N8N_WEBHOOK_BASE = https://n8n.srv811212.hstgr.cloud
VITE_N8N_WEBHOOK_ID = 91fcc006-c04e-463a-8acf-7c60577eb5ef
```

5. **Speichern**
6. **Deploys** → **Trigger deploy** → **Deploy site**

## 🎯 Finale Tests nach Environment Variables

Nach dem Redeploy (mit gesetzten Variables):

**Test in der App:**
1. Öffne `https://testsercan.netlify.app`
2. Gebe ein Thema ein: "Personaleinsatzplanung Geld sparen"
3. Klicke "Generate Ideas"
4. **Sollte funktionieren!** ✅

**Test in der Console (Browser F12):**
```javascript
// Sollte jetzt die n8n-Response zeigen
fetch('/api/n8n/webhook-test/91fcc006-c04e-463a-8acf-7c60577eb5ef', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: { text: 'Personaleinsatzplanung Geld sparen' } })
})
.then(r => r.json())
.then(data => console.log('N8N Response:', data));
```

## 📊 Debug-Logs

Falls es nicht funktioniert, schaue die Function-Logs an:

1. Netlify Dashboard → **Functions**
2. Klicke auf `n8n-proxy`
3. Schaue **Recent log entries**

Logs zeigen:
- `[N8N Proxy Function] Forwarding to: ...` → Request kam an
- `[N8N Proxy Function] Response status: 200` → n8n antwortet
- Fehler → Siehst du hier

## ✅ Success Checklist

- [ ] Function deployed (nicht mehr 404)
- [ ] Environment Variables gesetzt
- [ ] Redeploy nach Variables
- [ ] Test: Direct function call funktioniert
- [ ] Test: App-Request funktioniert
- [ ] 🎉 App läuft!

