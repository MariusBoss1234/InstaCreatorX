# Netlify Deployment Guide

## Übersicht

Diese Anleitung beschreibt, wie du die App auf Netlify deployst. Die App verwendet Netlify Functions als Proxy für n8n-Webhooks, um CORS-Probleme zu lösen.

## Architektur

```
Frontend (Netlify) → Netlify Function → n8n Webhook
```

## Voraussetzungen

1. Netlify-Account
2. Git-Repository mit diesem Code
3. n8n-Instanz mit aktiviertem Webhook

## Deployment-Schritte

### 1. Repository mit Netlify verbinden

1. Gehe zu [Netlify](https://app.netlify.com)
2. Klicke auf "Add new site" → "Import an existing project"
3. Wähle deinen Git-Provider (GitHub, GitLab, etc.)
4. Wähle dieses Repository aus

### 2. Build-Einstellungen konfigurieren

Netlify erkennt die Einstellungen automatisch aus `netlify.toml`, aber du kannst sie auch manuell überprüfen:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### 3. Umgebungsvariablen setzen

Gehe zu: **Site Settings → Environment Variables**

Füge folgende Variablen hinzu:

```bash
VITE_N8N_WEBHOOK_BASE=https://n8n.srv811212.hstgr.cloud
VITE_N8N_WEBHOOK_ID=91fcc006-c04e-463a-8acf-7c60577eb5ef
```

**Wichtig**: Auch die Netlify Function benötigt diese Variablen, um n8n zu erreichen.

### 4. Deploy starten

Klicke auf "Deploy site". Netlify wird:
1. Dependencies installieren (`npm install`)
2. Das Frontend bauen (`npm run build`)
3. Die TypeScript Netlify Function kompilieren
4. Alles deployen

### 5. Nach dem Deployment

Die App ist jetzt unter `https://your-site-name.netlify.app` erreichbar.

Die API-Anfragen laufen über:
- Frontend: `/api/n8n/webhook-test/:id`
- Netlify leitet um zu: `/.netlify/functions/n8n-proxy?id=:id`
- Function leitet weiter zu: `https://n8n.srv811212.hstgr.cloud/webhook-test/:id`

## Lokale Entwicklung mit Netlify CLI

Wenn du die Netlify Function lokal testen möchtest:

```bash
# Netlify CLI installieren
npm install -g netlify-cli

# Development Server mit Functions starten
netlify dev
```

Dies startet:
- Vite Dev Server (Frontend)
- Netlify Functions lokal

Die Anfragen gehen dann über `http://localhost:8888/api/n8n/webhook-test/:id`

## Debugging

### Logs anschauen

1. Gehe zu Netlify Dashboard
2. Wähle deine Site
3. Klicke auf "Functions" im Menü
4. Wähle "n8n-proxy"
5. Schaue dir die Logs an

### Häufige Probleme

#### 404 Error bei `/api/n8n/webhook-test/:id`

**Problem**: Die Redirect-Regel funktioniert nicht.

**Lösung**: 
- Prüfe, ob `netlify.toml` im Root-Verzeichnis liegt
- Stelle sicher, dass die Datei korrekt committed wurde
- Redeploy die Site

#### 500 Error in der Function

**Problem**: Die Umgebungsvariablen fehlen oder n8n ist nicht erreichbar.

**Lösung**:
- Prüfe die Environment Variables in Netlify
- Teste den n8n-Webhook direkt (z.B. mit Postman)
- Schaue dir die Function-Logs an

#### CORS Error trotz Proxy

**Problem**: Die CORS-Header werden nicht gesetzt.

**Lösung**:
- Prüfe die Function-Logs
- Stelle sicher, dass die Request durch die Function geht (nicht direkt zu n8n)

## Continous Deployment

Nach dem initialen Setup wird jeder Git Push automatisch deployed:

1. Push zu `main` Branch
2. Netlify erkennt den Push
3. Build und Deploy laufen automatisch
4. Die neue Version ist live

## Kosten

- Netlify Free Tier: 
  - 100 GB Bandbreite/Monat
  - 300 Minuten Build-Zeit/Monat
  - 125.000 Function Requests/Monat
  - Vollkommen ausreichend für Entwicklung und kleine Produktions-Apps

## Weitere Ressourcen

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Netlify Redirects](https://docs.netlify.com/routing/redirects/)
- [Environment Variables](https://docs.netlify.com/environment-variables/overview/)

