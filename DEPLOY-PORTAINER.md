# Deployment über Portainer – Anleitung

Dieser Ordner enthält alles, was für ein Deployment auf einer anderen Maschine
per Docker/Portainer nötig ist: `Dockerfile`, `docker-compose.yml`, kompletter
Quellcode (`apps/api`, `apps/web`), `.env.example`.

`node_modules`, `dist` und lokale Dev-Daten (`apps/api/data/users.json`) wurden
bewusst **nicht** mitkopiert – die werden beim Docker-Build bzw. beim ersten
Start frisch erzeugt.

## Wichtig: Portainer und `build:` in der docker-compose.yml

Die `docker-compose.yml` baut das Image selbst (`build: .`), es gibt kein
fertiges Image in einer Registry. Portainer kann das auf zwei Arten:

### Option A – Terminal-/SSH-Zugriff auf den Ziel-Docker-Host vorhanden (einfachster Weg)

1. Diesen kompletten Ordner auf den Ziel-Server kopieren, z. B. nach
   `/srv/json-log-viewer` (per `scp`, Netzwerkfreigabe, USB-Stick, …).
2. `.env.example` nach `.env` kopieren und Werte anpassen (siehe unten).
3. Auf dem Server im Ordner ausführen:
   ```bash
   docker compose up -d --build
   ```
4. Fertig – der Stack läuft und taucht in Portainer unter **Stacks** automatisch
   auf (Portainer erkennt per Compose-Projekt-Label laufende Stacks auch dann,
   wenn sie nicht über die Portainer-Oberfläche angelegt wurden). Von dort aus
   lässt er sich ganz normal starten/stoppen/aktualisieren.

### Option B – Nur die Portainer-Weboberfläche verfügbar, kein Terminal-Zugriff

Portainer kann Build-Kontexte nur dann selbst bauen, wenn es den kompletten
Ordner (inkl. `Dockerfile`) bekommt – das funktioniert zuverlässig über die
**Git-Repository-Methode**:

1. Diesen Ordner in ein Git-Repository pushen (z. B. privates GitHub-/GitLab-
   Repo oder ein selbst gehosteter Gitea/Forgejo-Server).
2. In Portainer: **Stacks → Add stack → Repository**.
3. Repository-URL eintragen (bei privatem Repo: Personal-Access-Token als
   Zugangsdaten hinterlegen), Branch auswählen, Compose-Pfad `docker-compose.yml`
   angeben.
4. Umgebungsvariablen (siehe unten) im Abschnitt "Environment variables" der
   Stack-Konfiguration setzen statt über `.env`.
5. **Deploy the stack** klicken – Portainer klont das Repo und baut das Image
   selbst.

> Reines Copy-Paste der `docker-compose.yml` in den "Web editor" oder
> Hochladen nur dieser einen Datei über "Upload" funktioniert **nicht**, weil
> Portainer dabei kein `Dockerfile` und keinen Quellcode zur Verfügung hat und
> der Build fehlschlägt.

## Benötigte Umgebungsvariablen (`.env` bzw. Portainer-Stack-Environment)

| Variable         | Bedeutung                                                              | Muss gesetzt werden? |
|------------------|---------------------------------------------------------------------------|------------------------|
| `SESSION_SECRET` | Geheimnis für Session-Cookies                                             | Ja – langes, zufälliges Secret (z. B. `openssl rand -hex 32`) |
| `ADMIN_USER`     | Initialer Admin-Benutzername (nur beim allerersten Start)                | Optional (Standard: `admin`) |
| `ADMIN_PASSWORD` | Initiales Admin-Passwort (nur beim allerersten Start)                     | **Ja, unbedingt** – sonst wird `admin/admin` angelegt |
| `COOKIE_SECURE`  | `true`, falls hinter HTTPS-Reverse-Proxy                                  | Optional (Standard: `false`) |
| `TRUST_PROXY`    | `true`, falls hinter nginx/Traefik mit HTTPS                              | Optional (Standard: `false`) |

Benutzerkonten liegen im Volume `jlv-data` (`/app/data/users.json`) und bleiben
über Container-Neustarts/Updates hinweg erhalten. Weitere Konten nachträglich
anlegen:

```bash
docker compose exec app node dist/cli/createUser.js --username max --password geheim
```

## Nach dem Deployment prüfen

- App unter `http://<ziel-server>:3001` erreichbar
- Login mit dem gesetzten Admin-Konto funktioniert
- `ADMIN_PASSWORD` danach ggf. über `create-user` ändern, falls initial nur
  ein Notbehelf gesetzt wurde
