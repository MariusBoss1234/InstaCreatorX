// n8n Code-Node: Binary-Daten aus data0 verarbeiten und für Imgur vorbereiten
// Verhindert doppelte Base64-Kodierung und validiert die Bilddaten

// Binary-Daten abrufen
const item = $input.first();
const binaryData = item.binary?.data0;

if (!binaryData) {
  throw new Error("Keine Binary-Daten gefunden in data0. Verfügbare Binary-Keys: " + Object.keys(item.binary || {}).join(', '));
}

console.log("===== BINARY DATA DEBUG =====");
console.log("Binary Keys:", Object.keys(item.binary || {}));
console.log("MIME Type:", binaryData.mimeType);
console.log("File Name:", binaryData.fileName);
console.log("File Extension:", binaryData.fileExtension);

// Base64 String Größe
const base64Length = binaryData.data.length;
console.log("Base64 String Length:", base64Length, "chars");

// Buffer erstellen und tatsächliche Größe prüfen
let buffer;
try {
  buffer = Buffer.from(binaryData.data, 'base64');
  console.log("Decoded Buffer Size:", buffer.length, "bytes");
  console.log("Decoded Buffer Size:", (buffer.length / 1024 / 1024).toFixed(2), "MB");
} catch (error) {
  console.log("ERROR: Kann nicht als Base64 dekodieren:", error.message);
  throw new Error("Binary-Daten sind kein gültiger Base64-String: " + error.message);
}

// Vergleich: Größenzunahme durch Base64
const sizeIncrease = ((base64Length / buffer.length - 1) * 100).toFixed(2);
console.log("Size Increase from Base64:", sizeIncrease + "%");

// PRÜFEN: Ist die Datei lesbar?
// Magic Numbers für verschiedene Formate prüfen
const magicBytes = buffer.slice(0, 4).toString('hex');
console.log("Magic Bytes (HEX):", magicBytes);

// Magic Numbers für verschiedene Formate:
// JPEG: ffd8ffe0 oder ffd8ffe1 oder ffd8ffe2
// PNG: 89504e47
// GIF: 47494638
// WebP: 52494646 (RIFF)
const isJPEG = magicBytes.startsWith('ffd8ff');
const isPNG = magicBytes === '89504e47';
const isGIF = magicBytes.startsWith('474946');
const isWebP = magicBytes === '52494646';

console.log("===== IMAGE FORMAT VALIDATION =====");
console.log("Is JPEG:", isJPEG);
console.log("Is PNG:", isPNG);
console.log("Is GIF:", isGIF);
console.log("Is WebP:", isWebP);

const isValidImage = isJPEG || isPNG || isGIF || isWebP;

if (!isValidImage) {
  console.log("===== WARNING: POSSIBLE DOUBLE ENCODING =====");
  console.log("File does not have valid image magic bytes!");
  console.log("This indicates double Base64 encoding.");
  
  // Versuche doppelte Dekodierung
  try {
    const doubleDecoded = Buffer.from(buffer.toString('utf-8'), 'base64');
    console.log("Double Decoded Size:", (doubleDecoded.length / 1024 / 1024).toFixed(2), "MB");
    
    const doubleMagic = doubleDecoded.slice(0, 4).toString('hex');
    console.log("Double Decoded Magic Bytes:", doubleMagic);
    
    // Wenn die doppelte Dekodierung gültig aussieht, nutze diese
    const isDoubleJPEG = doubleMagic.startsWith('ffd8ff');
    const isDoublePNG = doubleMagic === '89504e47';
    const isDoubleGIF = doubleMagic.startsWith('474946');
    const isDoubleWebP = doubleMagic === '52494646';
    
    const isDoubleValid = isDoubleJPEG || isDoublePNG || isDoubleGIF || isDoubleWebP;
    
    console.log("Double Decoded - Is JPEG:", isDoubleJPEG);
    console.log("Double Decoded - Is PNG:", isDoublePNG);
    console.log("Double Decoded - Is GIF:", isDoubleGIF);
    console.log("Double Decoded - Is WebP:", isDoubleWebP);
    
    if (isDoubleValid) {
      console.log("✓ Doppelte Base64-Kodierung erkannt! Nutze doppelt dekodierte Version.");
      buffer = doubleDecoded;
    } else {
      throw new Error("Datei ist weder einfach noch doppelt kodiert ein gültiges Bild! Magic Bytes: " + magicBytes);
    }
  } catch (e) {
    console.log("Doppelte Dekodierung fehlgeschlagen:", e.message);
    throw new Error("Ungültige Bilddatei - konnte nicht dekodiert werden: " + e.message);
  }
}

// Prüfe Imgur Größenbeschränkungen
const maxSize = 50 * 1024 * 1024; // 50MB für Bilder
const maxPngSize = 5 * 1024 * 1024; // 5MB für PNG (wird zu JPEG konvertiert)

if (buffer.length > maxSize) {
  throw new Error(`Datei zu groß: ${(buffer.length / 1024 / 1024).toFixed(2)} MB. Imgur Maximum: 50 MB`);
}

if (isPNG && buffer.length > maxPngSize) {
  console.log(`HINWEIS: PNG ist größer als 5MB (${(buffer.length / 1024 / 1024).toFixed(2)} MB). Imgur wird es zu JPEG konvertieren.`);
}

// Prüfe MIME Type
const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/apng', 'image/tiff'];
const mimeType = binaryData.mimeType || 'image/jpeg';

if (!supportedTypes.includes(mimeType)) {
  console.log(`WARNUNG: MIME Type '${mimeType}' möglicherweise nicht von Imgur unterstützt. Fahre trotzdem fort.`);
}

console.log("===== FINAL VALIDATION =====");
console.log("✓ Binary-Daten sind gültig");
console.log("✓ Größe:", (buffer.length / 1024 / 1024).toFixed(2), "MB");
console.log("✓ Format:", isJPEG ? 'JPEG' : isPNG ? 'PNG' : isGIF ? 'GIF' : isWebP ? 'WebP' : 'Unbekannt');
console.log("✓ MIME Type:", mimeType);

// Finale Datei für Upload vorbereiten
// WICHTIG: Nicht nochmal durch prepareBinaryData, das würde wieder kodieren!
return {
  json: {
    fileName: binaryData.fileName || 'image.jpg',
    mimeType: mimeType,
    sizeInBytes: buffer.length,
    sizeInMB: (buffer.length / 1024 / 1024).toFixed(2),
    isValid: true,
    format: isJPEG ? 'JPEG' : isPNG ? 'PNG' : isGIF ? 'GIF' : isWebP ? 'WebP' : 'Unknown',
    debug: {
      magicBytes: magicBytes,
      originalBase64Length: base64Length,
      decodedBufferLength: buffer.length,
      sizeIncrease: sizeIncrease + '%'
    }
  },
  binary: {
    data: {
      data: buffer.toString('base64'), // Nur einmal kodiert
      mimeType: mimeType,
      fileName: binaryData.fileName || 'image.jpg',
      fileExtension: binaryData.fileExtension || binaryData.fileName?.split('.').pop() || 'jpg'
    }
  }
};
