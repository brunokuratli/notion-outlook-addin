# Email to Notion - Outlook Add-in

Ein selbst-gehostetes Outlook Add-in zum Speichern von E-Mails und Anhängen in Notion.

## Features

- E-Mails zu Notion Datenbanken oder Seiten exportieren
- Auswahl der Ziel-Datenbank/Seite
- E-Mail-Text und Metadaten übertragen
- Anhänge einbeziehen (Text-basierte Dateien werden inline angezeigt)
- Komplett selbst verwaltet - keine Drittanbieter

## Voraussetzungen

- Node.js (v18 oder höher)
- Outlook (Web, Desktop oder neues Outlook für Windows)
- Ein Notion Account mit Integration

## Installation

### 1. Notion Integration erstellen

1. Gehe zu https://www.notion.so/my-integrations
2. Klicke auf "New integration"
3. Gib einen Namen ein (z.B. "Outlook Email Import")
4. Wähle den Workspace
5. Unter "Capabilities" aktiviere:
   - Read content
   - Insert content
   - Update content
6. Kopiere den "Internal Integration Token" (beginnt mit `secret_` oder `ntn_`)

### 2. Notion Datenbank vorbereiten

1. Erstelle eine neue Datenbank in Notion (oder nutze eine bestehende)
2. Klicke auf `...` → "Connections" → "Connect to" → wähle deine Integration
3. Die Datenbank benötigt mindestens eine Title-Property (Standard: "Name")

### 3. Add-in installieren

```bash
# Repository klonen oder Dateien kopieren
cd notion-outlook-addin

# Dependencies installieren
npm install

# Entwickler-Zertifikate installieren (für HTTPS)
npm run certs

# Dev-Server starten
npm start
```

### 4. Add-in in Outlook laden (Sideloading)

#### Outlook Web:
1. Öffne https://outlook.office.com
2. Öffne eine E-Mail
3. Klicke auf `...` → "Get Add-ins"
4. Klicke auf "My add-ins" → "Add a custom add-in" → "Add from file"
5. Wähle die `manifest.xml` Datei

#### Outlook Desktop (Windows):
1. Öffne Outlook
2. Gehe zu Datei → Optionen → Trust Center → Trust Center-Einstellungen
3. Klicke auf "Add-ins verwalten"
4. Wähle "Meine Add-ins" → "Benutzerdefiniertes Add-in hinzufügen"
5. Wähle die `manifest.xml` Datei

#### Outlook Desktop (Mac):
1. Öffne Outlook
2. Gehe zu Tools → Get Add-ins
3. Klicke auf "My Add-ins" → "Add a custom add-in"
4. Wähle die `manifest.xml` Datei

## Verwendung

1. Öffne eine E-Mail in Outlook
2. Klicke auf "Zu Notion" in der Ribbon-Leiste
3. Beim ersten Start: Gib deinen Notion Integration Token ein
4. Wähle die Ziel-Datenbank oder Elternseite
5. Aktiviere/Deaktiviere Optionen (Body, Anhänge, HTML)
6. Klicke auf "Zu Notion senden"

## Projektstruktur

```
notion-outlook-addin/
├── manifest.xml          # Add-in Manifest für Outlook
├── src/
│   ├── taskpane/
│   │   ├── taskpane.html # Task Pane UI
│   │   ├── taskpane.css  # Styling
│   │   └── taskpane.js   # Haupt-Logik
│   └── commands.html     # Function Commands
├── assets/               # Icons
├── scripts/
│   └── generate-icons.js # Icon-Generator
├── webpack.config.js     # Webpack Konfiguration
└── package.json
```

## Entwicklung

```bash
# Dev-Server mit Hot-Reload starten
npm run dev

# Production Build erstellen
npm run build

# Manifest validieren
npm run validate
```

## Bekannte Einschränkungen

1. **Datei-Uploads**: Notion's API unterstützt keinen direkten Datei-Upload. Text-basierte Anhänge werden inline eingefügt. Für andere Dateitypen wird nur der Name/Größe notiert.

2. **CORS**: Der Dev-Server muss lokal laufen. Für Produktion ist ein echter HTTPS-Server erforderlich.

3. **Token-Speicherung**: Der Token wird im LocalStorage des Browsers gespeichert. Bei Bedenken kann dies auf einen Backend-Service umgestellt werden.

## Produktion

Für den produktiven Einsatz:

1. Build erstellen: `npm run build`
2. `dist/` Ordner auf einen HTTPS-Server deployen
3. URLs in `manifest.xml` auf den Server ändern
4. Manifest über Admin-Center verteilen

## Lizenz

MIT

## Quellen

- [Microsoft Office Add-ins Dokumentation](https://learn.microsoft.com/en-us/office/dev/add-ins/)
- [Notion API Dokumentation](https://developers.notion.com/)
