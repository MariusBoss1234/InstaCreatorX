# Imgur Upload Fix - Binary Data Handling

## Problem

Die Netlify Function hat Binary-Daten doppelt Base64-kodiert, was zu folgenden Problemen führte:
- Dateigröße verdoppelt sich (2.2 MB → 4.3 MB)
- Datei konnte nicht geöffnet werden
- Imgur API gab 400 Error zurück ("file type not supported")

## Ursache

1. **Netlify Functions kodieren automatisch Binary-Daten als Base64**, wenn sie in `event.body` sind und `event.isBase64Encoded = true`
2. **Die alte Proxy-Function hat nur JSON verarbeitet**, nicht `multipart/form-data`
3. **n8n erhielt einen Base64-String statt echter Binary-Daten**
4. **n8n's Binary-Verarbeitung kodierte nochmal**, was zu doppelter Kodierung führte

## Lösung

### 1. Neue Netlify Function: `n8n-upload.js`

Erstellt in: `netlify/functions/n8n-upload.js`

**Features:**
- ✅ Parst `multipart/form-data` mit `busboy`
- ✅ Extrahiert Binary-Daten als Buffer (NICHT als Base64-String)
- ✅ Leitet Binary-Daten direkt als FormData an n8n weiter
- ✅ Dekodiert automatisch wenn `event.isBase64Encoded = true`
- ✅ Validiert Bilddaten (Magic Bytes Check)
- ✅ Ausführliches Logging für Debugging

**Dependencies:**
```json
{
  "dependencies": {
    "busboy": "^1.6.0",
    "form-data": "^4.0.0",
    "node-fetch": "^2.7.0"
  }
}
```

Installiere mit:
```bash
cd netlify/functions
npm install
```

### 2. Frontend Änderung: `n8n-api.ts`

**Änderung:** `uploadAndProcessImage()` nutzt jetzt die neue Upload-Function:

```typescript
// Vorher: Nutzte den normalen JSON-Proxy
const webhookUrl = `${N8N_WEBHOOK_BASE}/${N8N_WEBHOOK_ID}`;

// Jetzt: Nutzt die dedizierte Upload-Function
const uploadUrl = `/.netlify/functions/n8n-upload?id=${N8N_WEBHOOK_ID}`;
```

**Wichtig:** FormData-Struktur:
```javascript
formData.append('photo', file, file.name);  // Datei als "photo"
formData.append('message', JSON.stringify(messageData));  // Metadaten
formData.append('intent', 'upload');  // Routing für n8n
```

### 3. n8n Workflow - Code Node

Erstellt in: `n8n-prompts/code-node-binary-validation.js`

**Funktion:**
- ✅ Liest Binary-Daten aus `data0`
- ✅ Dekodiert Base64 zu Buffer
- ✅ Prüft Magic Bytes (JPEG: ffd8ff, PNG: 89504e47, etc.)
- ✅ Erkennt doppelte Base64-Kodierung automatisch
- ✅ Validiert Imgur Größenlimits (50 MB max, 5 MB PNG)
- ✅ Gibt saubere Binary-Daten für den HTTP Request Node aus

**Verwendung in n8n:**
1. Webhook Node empfängt FormData
2. **Code Node** (mit diesem Code) → validiert und verarbeitet Binary-Daten
3. HTTP Request Node → lädt zu Imgur hoch

### 4. n8n HTTP Request Node - Imgur Upload

**Konfiguration:**

```
Method: POST
URL: https://api.imgur.com/3/image

Authentication:
  Type: Generic Credential Type
  Name: Authorization
  Value: Client-ID DEIN_IMGUR_CLIENT_ID

Body Content Type: Form-Data (Multipart)

Form-Data Fields:
  Field 1:
    Name: image
    Input Data Field Name: data
  
  Field 2:
    Name: type
    Value: file
```

**Wichtig:** 
- ✅ `type=file` ist KRITISCH - Imgur erwartet diesen Parameter bei Binary-Uploads
- ✅ Binary Property Name muss `data` sein (Output vom Code Node)
- ✅ Nutze `Client-ID` statt OAuth2 für einfache Uploads

## Testing

### 1. Teste die Netlify Function lokal

```bash
# Installiere Netlify CLI
npm install -g netlify-cli

# Starte Dev Server
netlify dev
```

### 2. Teste mit curl

```bash
curl -X POST http://localhost:8888/.netlify/functions/n8n-upload?id=DEINE-WEBHOOK-ID \
  -F "photo=@/path/to/test-image.jpg" \
  -F "message={\"caption\":\"test\"}" \
  -F "intent=upload"
```

### 3. Prüfe n8n Logs

Im Code Node solltest du sehen:
```
===== BINARY DATA DEBUG =====
Binary Keys: data0
MIME Type: image/jpeg
File Name: test.jpg
Decoded Buffer Size: 2.20 MB
Magic Bytes (HEX): ffd8ffe0
✓ Binary-Daten sind gültig
```

## Debugging

### Problem: "Keine Binary-Daten gefunden"

**Check:**
```javascript
// In n8n Code Node
console.log("All binary keys:", Object.keys($input.first().binary || {}));
```

Wenn leer → Webhook empfängt keine Binary-Daten
- Prüfe ob Frontend FormData korrekt sendet
- Prüfe Netlify Function Logs

### Problem: "File type not supported" von Imgur

**Check:**
```javascript
// In n8n Code Node
const buffer = Buffer.from(binaryData.data, 'base64');
const magicBytes = buffer.slice(0, 4).toString('hex');
console.log("Magic Bytes:", magicBytes);
```

**Erwartete Werte:**
- JPEG: `ffd8ffe0` oder `ffd8ffe1`
- PNG: `89504e47`
- GIF: `47494638`

Wenn andere Werte → Datei ist korrupt oder doppelt kodiert

### Problem: Doppelte Base64-Kodierung

**Symptome:**
- Magic Bytes sind nicht erkennbar
- Dateigröße verdoppelt sich
- Datei kann nicht geöffnet werden

**Lösung:** Der Code Node erkennt das automatisch und dekodiert nochmal:
```javascript
const doubleDecoded = Buffer.from(buffer.toString('utf-8'), 'base64');
```

## Imgur API Limits

| Format | Max Size | Hinweis |
|--------|----------|---------|
| JPEG   | 50 MB    | Empfohlen |
| PNG    | 5 MB     | Wird zu JPEG konvertiert wenn >5MB |
| GIF    | 50 MB    | Statisch |
| Animated GIF | 200 MB | Animiert |
| Video  | 200 MB   | MP4, MPEG, AVI, WebM, etc. |

## Environment Variables

In `.env`:
```bash
VITE_N8N_WEBHOOK_BASE=https://n8n.srv811212.hstgr.cloud
VITE_N8N_WEBHOOK_ID=91fcc006-c04e-463a-8acf-7c60577eb5ef
```

## Deployment

### Netlify

1. **Dependencies werden automatisch installiert** aus `netlify/functions/package.json`

2. **Function wird automatisch deployed** bei Git Push

3. **Prüfe Logs:**
   ```bash
   netlify functions:log n8n-upload
   ```

### Vercel (Alternative)

Falls du auf Vercel deployen willst:

```javascript
// api/n8n-upload.js
const busboy = require('busboy');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Same code as Netlify Function
  // aber mit req/res statt event/context
};
```

## Troubleshooting Checklist

- [ ] Netlify Function Dependencies installiert? (`cd netlify/functions && npm install`)
- [ ] Frontend nutzt die neue Upload-URL? (`/.netlify/functions/n8n-upload`)
- [ ] n8n Code Node gibt `binary.data` zurück?
- [ ] HTTP Request Node hat `type=file` gesetzt?
- [ ] Imgur Client-ID korrekt?
- [ ] Datei unter 50 MB?
- [ ] MIME Type unterstützt? (JPEG, PNG, GIF)

## Links

- [Imgur API Docs](https://apidocs.imgur.com/#c85c9dfc-7487-4de2-9ecd-66f727cf3139)
- [Busboy Docs](https://github.com/mscdex/busboy)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
