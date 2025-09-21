# N8N AI Agent (Post Vorschläge) - JSON Output Prompt

## System Message (für n8n AI Agent Node)

```
===# Rolle
Sie sind Content-Stratege für Instagram (Feed, Story, Reel) in der Ästhetischen Medizin (Hyaluron, Skinbooster etc.)

===# Posttype: {{ $json.body.message.text }}

==# Ziel
Erzeugen von konservativen, praxistauglichen **Post-Ideen** für IG, die direkt in Copy- und Bild-Prompts überführbar sind. Keine Heilversprechen, keine Preise, kein Vorher/Nachher, keine Nadeln/Blut, keine Selbstbehandlung.

==# IG-Logik
- Feed: 1:1, klar & faktisch.
- Story/Reel: 9:16, extrem prägnant.

==# Bausteine je Idee
Titel | Format (feed/story/reel) | cta oder organic (wortwörtlich entweder cta oder organic)

==# Ausgabeformat
- Exakt 8 Zeilen, jede Zeile 1 Idee, Pipe-getrennt (|).
- Keine Einleitung, keine Erklärungen.
- Deutsch, prägnant, keine Platzhalter.
```

## User Prompt Template (für n8n Eingabe)

```
===# Posttype: {{ $json.body.message.text }}

Generieren Sie 8 Post-Ideen zu diesem Thema.
```

## Frontend-Parser Update

```typescript
// In use-n8n-generation.ts - updatete generatePostIdeas Parsing:
const ideas: GeneratedPostIdea[] = rawIdeas.map((ideaObj, index) => {
  // Wenn n8n JSON zurückgibt, direkt verwenden
  if (typeof ideaObj === 'object' && ideaObj.title) {
    return {
      id: `n8n-idea-${Date.now()}-${index}`,
      title: ideaObj.title,
      format: (ideaObj.format as InstagramFormat) || params.format,
      postType: (ideaObj.postType as PostType) || params.postType,
      createdAt: new Date(),
      prompt: ideaObj.title,
      description: `${ideaObj.layout} Layout für ${ideaObj.format}`, // Neue description
    };
  }
  
  // Fallback für String-Format (bestehende Logik)
  // ... existing parsing logic
});
```

## N8N Workflow Changes

1. **AI Agent Node Einstellungen:**
   - System Message: obigen Prompt verwenden
   - Response Format: JSON
   - Temperature: 0.7

2. **Respond to Webhook Node:**
   - Respond With: "All Incoming Items" 
   - Content-Type: application/json

3. **Optional: JSON Validator Node** (vor Response):
   ```javascript
   // Validiere und formatiere JSON-Output
   const output = $input.first().json.output;
   
   try {
     const ideas = JSON.parse(output);
     if (Array.isArray(ideas) && ideas.length === 8) {
       return [{ ideas }];
     }
   } catch (e) {
     // Fallback zu String-Parsing
     return [{ output }];
   }
   ```
