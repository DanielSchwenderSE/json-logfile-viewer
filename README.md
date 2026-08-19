# JSON Log Viewer

Web-Anwendung für das Helpdesk-Team, um JSON-/JSONL-Logdateien und ZIP-Logpakete
im Browser zu öffnen, zu durchsuchen, zu filtern und im Detail zu inspizieren.
Logs werden **ausschließlich clientseitig** geparst und entpackt — es wird
nichts an den Server hochgeladen.

## Funktionen

- **Login** mit lokalen Benutzerkonten (Session-Cookie, kein AD nötig)
- **Datei laden** per Drag & Drop oder Dateiauswahl: `.json`, `.jsonl`, `.ndjson`, `.log`, `.txt`
- **ZIP-Support**: Logpakete öffnen, enthaltene Dateien in der Sidebar auflisten und per Klick öffnen — mehrere Dateien gleichzeitig als Tabs
- **Automatische Format-Erkennung** (JSON Lines / JSON-Array / gemischt) inkl. Anzeige übersprungener, defekter Zeilen
- **Feld-Mapping**: Zeitstempel-, Level- und Message-Feld werden automatisch erkannt
- **Level-Filter**, **Volltextsuche** mit Hervorhebung, **Zeitraum-Filter**
- **Suchergebnis-Navigation**: Klick auf einen Treffer scrollt zur Zeile, klappt sie auf und hebt sie kurz hervor
- **Aufklappbare JSON-Detailansicht** je Zeile (Stacktraces, verschachtelte Objekte) mit Kopierfunktion
- **Virtualisierte Tabelle** für flüssiges Scrollen auch bei großen Dateien (~10 MB)
- **Multi-Tab-System** für mehrere gleichzeitig geöffnete Logs
- Hell-/Dunkelmodus

## Projektstruktur

```
apps/
  api/    Express-Backend: Auth (Session), Benutzerverwaltung, Ausliefern der SPA
  web/    React + Vite Frontend: Parsing, ZIP-Entpacken, UI
```

Der Login ist über ein `AuthProvider`-Interface abstrahiert
(`apps/api/src/auth/AuthProvider.ts`). Aktuell implementiert:
`LocalAuthProvider` (dateibasierte Benutzerkonten). Eine spätere AD-/Entra-Anbindung
kann als weitere Implementierung ergänzt werden, ohne die Routen anzufassen.

Benutzerkonten werden **ohne Datenbank** in `data/users.json` gespeichert
(Passwort mit bcrypt gehasht) — für eine Handvoll Helpdesk-Konten ausreichend
und ohne native Abhängigkeiten.

## Lokale Entwicklung

Voraussetzung: Node.js 20+.

```powershell
# Backend
cd apps/api
npm install
npm run dev        # http://localhost:3001

# Frontend (in einem zweiten Terminal)
cd apps/web
npm install
npm run dev         # http://localhost:5173 (Proxy zur API)
```

Im Dev-Betrieb legt die API beim ersten Start automatisch ein Admin-Konto an
(`admin` / `admin`, falls keine Umgebungsvariablen gesetzt sind — siehe Konsolen-Warnung).

### Benutzerkonten verwalten

```powershell
cd apps/api
npm run create-user -- --username max --password geheim --name "Max Muster"
npm run create-user -- --list
npm run create-user -- --delete max
```

## Betrieb per Docker

```powershell
# .env neben docker-compose.yml anlegen (siehe unten), dann:
docker compose up -d --build
```

Die Anwendung ist danach unter `http://localhost:3001` erreichbar (Frontend
und Backend laufen im selben Container; das Frontend wird als statische
Dateien von Express ausgeliefert).

### Konfiguration (`.env`)

| Variable         | Bedeutung                                                              | Standard                     |
|------------------|-------------------------------------------------------------------------|-------------------------------|
| `SESSION_SECRET` | Geheimnis zum Signieren der Session-Cookies — **in Produktion setzen!** | `bitte-unbedingt-aendern`     |
| `ADMIN_USER`     | Benutzername des initialen Admin-Kontos (nur bei erstem Start)         | `admin`                       |
| `ADMIN_PASSWORD` | Passwort des initialen Admin-Kontos (nur bei erstem Start)             | `admin` (mit Warnung im Log)  |
| `COOKIE_SECURE`  | Cookie nur über HTTPS senden — bei Betrieb hinter TLS-Reverse-Proxy auf `true` | `false`                |
| `TRUST_PROXY`    | Express `trust proxy` aktivieren — nötig hinter nginx/Traefik mit HTTPS | `false`                       |

Benutzerkonten liegen im Docker-Volume `jlv-data` (`/app/data/users.json`).
Weitere Konten nachträglich anlegen:

```powershell
docker compose exec app node dist/cli/createUser.js --username max --password geheim
```

> **Hinweis:** Nach dem allerersten Start unbedingt `ADMIN_PASSWORD` setzen bzw.
> das Standardkonto `admin/admin` sofort ändern.

## Später geplant (bewusst außerhalb des aktuellen Umfangs)

- AD-/Entra-ID-Login als weitere `AuthProvider`-Implementierung
- Serverseitiger Log-Abruf (z. B. per Pfad/API) zusätzlich zum manuellen Upload
- Rollen/Rechte über "eingeloggt/nicht eingeloggt" hinaus

## End-to-End-Verifikation (manuell)

- [ ] `docker compose up` → App erreichbar, Login mit Seed-Konto funktioniert, ohne Login kein Zugriff auf den Viewer
- [ ] JSON-Lines- und JSON-Array-Testdatei laden → beide korrekt erkannt, Zeitstempel/Level automatisch zugeordnet
- [ ] Datei mit fehlerhaften Zeilen laden → App überspringt sie, Anzahl wird angezeigt
- [ ] `.zip` mit mehreren Logs laden → Sidebar zeigt alle Dateien, jede Datei per Klick öffnen (auch nicht-erste Dateien!) → jeweils neuer Tab
- [ ] Level-Filter, Volltextsuche (inkl. Highlight) und Zeitraum-Filter reduzieren die Treffer korrekt
- [ ] Klick auf Suchtreffer scrollt zur Zeile und hebt sie hervor
- [ ] Verschachtelte Objekte lassen sich aufklappen, JSON kopieren funktioniert
- [ ] ~10-MB-Datei bleibt beim Scrollen/Filtern flüssig
- [ ] Mehrere Tabs gleichzeitig offen, Tab schließen aktiviert korrekt den nächsten Tab
