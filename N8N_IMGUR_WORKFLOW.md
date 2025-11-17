# n8n Workflow - Imgur Upload Configuration

## Workflow Aufbau

```
Webhook → Code (Binary Validation) → HTTP Request (Imgur) → Response
```

## 1. Webhook Node

**Settings:**
- **HTTP Method:** POST
- **Path:** `/webhook-test/91fcc006-c04e-463a-8acf-7c60577eb5ef`
- **Response Mode:** Respond Using Webhook
- **Response Data:** First Entry JSON

**Options:**
- **Binary Data:** ✅ Enable
- **Field Name for Binary Data:** (leer lassen oder "photo")

**Test:**
```bash
curl -X POST https://n8n.srv811212.hstgr.cloud/webhook-test/91fcc006-c04e-463a-8acf-7c60577eb5ef \
  -F "photo=@test.jpg" \
  -F "intent=upload"
```

**Expected Output:**
```json
{
  "headers": { ... },
  "params": { ... },
  "query": { ... },
  "body": {
    "intent": "upload"
  },
  "binary": {
    "data0": {
      "data": "base64string...",
      "mimeType": "image/jpeg",
      "fileName": "test.jpg"
    }
  }
}
```

## 2. Code Node - Binary Validation

**Type:** JavaScript (Run Once for All Items)

**Code:** (siehe `n8n-prompts/code-node-binary-validation.js`)

**Key Points:**
- Liest `$input.first().binary.data0`
- Dekodiert Base64 → Buffer
- Validiert Magic Bytes
- Erkennt doppelte Kodierung
- Gibt `binary.data` zurück

**Expected Output:**
```json
{
  "json": {
    "fileName": "test.jpg",
    "mimeType": "image/jpeg",
    "sizeInMB": "2.20",
    "isValid": true,
    "format": "JPEG",
    "debug": {
      "magicBytes": "ffd8ffe0",
      "decodedBufferLength": 2304512
    }
  },
  "binary": {
    "data": {
      "data": "base64...",
      "mimeType": "image/jpeg",
      "fileName": "test.jpg"
    }
  }
}
```

## 3. HTTP Request Node - Imgur Upload

**Method:** POST  
**URL:** `https://api.imgur.com/3/image`

### Authentication

**Type:** Generic Credential Type

**Header Authentication:**
- **Name:** Authorization
- **Value:** `Client-ID <DEIN_CLIENT_ID>`

**Imgur Client ID erhalten:**
1. Gehe zu https://api.imgur.com/oauth2/addclient
2. Application name: "InstaCreatorX"
3. Authorization type: "OAuth 2 authorization without a callback URL"
4. Email: deine Email
5. Description: "Instagram Content Creation Tool"
6. **Kopiere die Client ID**

### Body Configuration

**Send Body:** ✅ Yes  
**Body Content Type:** Form-Data (Multipart)  
**Specify Body:** Using Fields

**Fields:**

| Parameter Name | Parameter Type | Input Data Field Name / Value |
|----------------|----------------|-------------------------------|
| `image`        | Binary Data    | `data` |
| `type`         | Fixed Value    | `file` |

**WICHTIG:** 
- ✅ `type=file` ist erforderlich für Binary-Uploads
- ✅ Binary Property Name muss `data` sein (vom Code Node)

### Response

**Expected Success Response (200):**
```json
{
  "data": {
    "id": "xYz123",
    "title": null,
    "description": null,
    "datetime": 1234567890,
    "type": "image/jpeg",
    "animated": false,
    "width": 1024,
    "height": 1024,
    "size": 2304512,
    "views": 0,
    "bandwidth": 0,
    "vote": null,
    "favorite": false,
    "nsfw": null,
    "section": null,
    "account_url": null,
    "account_id": 0,
    "is_ad": false,
    "in_most_viral": false,
    "has_sound": false,
    "tags": [],
    "ad_type": 0,
    "ad_url": "",
    "edited": "0",
    "in_gallery": false,
    "deletehash": "aBc123XyZ",
    "name": "",
    "link": "https://i.imgur.com/xYz123.jpg"
  },
  "success": true,
  "status": 200
}
```

**URL extrahieren:**
```javascript
// In Frontend oder n8n
const imageUrl = response.data.link;
// z.B. https://i.imgur.com/xYz123.jpg
```

## 4. Response to Webhook

**Mode:** Using 'Respond to Webhook' Node oder inline in HTTP Request

**Return Data:**
```json
{
  "success": true,
  "data": {
    "link": "https://i.imgur.com/xYz123.jpg"
  }
}
```

## Error Handling

### Common Errors

#### 400 - Bad Request
**Ursache:** Ungültiges Dateiformat oder fehlende Parameter

**Check:**
1. Ist `type=file` gesetzt?
2. Ist die Datei unter 50 MB?
3. Sind die Binary-Daten gültig?

**Fix:** Prüfe Code Node Logs für Magic Bytes

#### 401 - Unauthorized
**Ursache:** Fehlende oder ungültige Client-ID

**Fix:** 
```
Authorization: Client-ID <DEINE_CLIENT_ID>
```

#### 403 - Forbidden
**Ursache:** Rate Limit überschritten

**Imgur Limits:**
- 1,250 uploads pro Tag (kostenlos)
- 12,500 uploads pro Tag (Pro Account)

#### 413 - Payload Too Large
**Ursache:** Datei größer als 50 MB

**Fix:** Frontend-Validierung oder Image Compression

### Debug Checklist

**In Code Node:**
```javascript
// Füge am Anfang hinzu:
console.log("=== INPUT DEBUG ===");
console.log("Binary keys:", Object.keys($input.first().binary || {}));
console.log("JSON keys:", Object.keys($input.first().json || {}));

// Nach Buffer-Dekodierung:
console.log("Buffer first 20 bytes:", buffer.slice(0, 20).toString('hex'));

// Am Ende:
console.log("=== OUTPUT DEBUG ===");
console.log("Output binary keys:", Object.keys($return[0].binary || {}));
```

**In HTTP Request Node:**
- ✅ Enable "Response" → "Include Response Headers and Status"
- ✅ Check "Options" → "Redirect" → "Follow Redirect"
- ✅ Set "Options" → "Timeout" → 30000 (30 Sekunden)

## Alternative: Base64 Upload

Falls Binary-Upload nicht funktioniert, nutze `type=base64`:

```javascript
// In Code Node
return {
  json: {
    image: buffer.toString('base64'),
    type: 'base64'
  }
};
```

**HTTP Request Node:**
```
Body Content Type: JSON

Body:
{
  "image": "={{ $json.image }}",
  "type": "base64"
}
```

**ABER:** Das ist weniger effizient (größere Payload) und funktioniert nicht mit `multipart/form-data`.

## Testing

### 1. Teste nur den Webhook

```bash
curl -X POST https://n8n.srv811212.hstgr.cloud/webhook-test/91fcc006-c04e-463a-8acf-7c60577eb5ef \
  -H "Content-Type: application/json" \
  -d '{"intent": "test"}'
```

### 2. Teste Binary Upload

```bash
curl -X POST https://n8n.srv811212.hstgr.cloud/webhook-test/91fcc006-c04e-463a-8acf-7c60577eb5ef \
  -F "photo=@/path/to/image.jpg" \
  -F "intent=upload" \
  -F "message={\"caption\":\"Test Upload\"}"
```

### 3. Teste via Frontend

```bash
cd /workspaces/InstaCreatorX
npm run dev
```

Dann:
1. Öffne http://localhost:5173
2. Gehe zu "Upload Image"
3. Wähle ein Testbild aus
4. Prüfe Browser Console und n8n Execution Logs

## Monitoring

### n8n Execution Logs

1. Gehe zu n8n UI
2. Klicke auf "Executions"
3. Finde die Upload-Execution
4. Prüfe jeden Node:
   - Webhook: Hat es Binary-Daten empfangen?
   - Code: Wurden die Daten validiert?
   - HTTP Request: War die Antwort 200?

### Netlify Function Logs

```bash
netlify functions:log n8n-upload --follow
```

Oder in Netlify UI:
1. Site Dashboard
2. Functions
3. n8n-upload
4. Function log

## Performance Optimierung

### 1. Image Compression (Frontend)

```typescript
// In Frontend vor Upload
async function compressImage(file: File): Promise<File> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = await createImageBitmap(file);
  
  // Max 1920px Breite
  const maxWidth = 1920;
  const scale = Math.min(1, maxWidth / img.width);
  
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  
  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
}
```

### 2. Caching (Optional)

```javascript
// In n8n Code Node - Hash berechnen
const crypto = require('crypto');
const hash = crypto.createHash('md5').update(buffer).digest('hex');

// Prüfe ob bereits hochgeladen
// z.B. in n8n Memory Store oder Datenbank
```

## Kosten

**Imgur:**
- ✅ Kostenlos: 1,250 uploads/Tag
- Pro: $5/Monat, 12,500 uploads/Tag

**Netlify:**
- ✅ Kostenlos: 125k function invocations/Monat
- Pro: $19/Monat, unbegrenzt

**n8n:**
- Self-hosted: Kostenlos
- Cloud: Ab €20/Monat

## Alternativen zu Imgur

Falls Imgur Limits überschritten:

1. **Cloudinary** - Großzügiger Free Tier
2. **imgbb** - Ähnlich wie Imgur
3. **Amazon S3** - Pay-per-use
4. **Google Cloud Storage** - Mit n8n Google Drive Node

Workflow bleibt gleich, nur HTTP Request Node URL/Auth ändern.
