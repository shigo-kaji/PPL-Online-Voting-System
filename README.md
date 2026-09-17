# Online Voting System

The assignment mapping and current gaps are in `docs/REQUIREMENTS_AUDIT.md`. A documentation draft with all 20 required sections is in `docs/PROJECT_DOCUMENTATION_DRAFT.md`.

A classroom election MVP using an Angular frontend and a Django REST Framework API. The backend is configured for PostgreSQL on Neon when `DATABASE_URL` is set; local development can use SQLite.

## Current features

- Administrator creates voter accounts, elections, and candidates through Django Admin.
- Registered voters sign in with a session and cast one vote per election.
- Elections open and close according to their configured times.
- The API checks candidate membership, election status, and duplicate voting.
- A database unique constraint enforces one vote per voter per election.
- Results are visible to signed-in users after the election closes.
- The Angular app provides a public-facing home page, election cards, candidate ballot, confirmation, and results view.

## Setup

Use Python 3.12. Run these commands from `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Create a Neon database and copy its PostgreSQL connection string. Set it as an environment variable in the terminal that runs Django. Keep the password out of source control.

## Technology versions

- Python 3.12.7
- Django 6.0.2
- Django REST Framework 3.16.1
- Angular 21.2.23 (`@angular/core`)
- Angular CLI 21.2.24
- TypeScript 5.9.3
- Node.js 24.13.1
- npm 11.8.0

```powershell
$env:DATABASE_URL = 'postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require'
$env:DJANGO_SECRET_KEY = 'replace-with-a-long-random-secret'
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open `http://127.0.0.1:8000/admin/`. Add a regular user for each voter (do not mark voter accounts as staff). Create an election with start and end times, add candidates, and select **Is published**. The sample `.env.example` lists the available settings. If `DATABASE_URL` is absent, Django uses a local SQLite file for offline development; set `DATABASE_URL` to use Neon.

Run tests with `python manage.py test`. Django creates a separate test database. Do not run tests against a Neon database containing real demo data.

## Angular frontend

In a second terminal, run from `frontend/`:

```powershell
npm install
npm run build
npm start
```

Open `http://127.0.0.1:4200/`. `npm start` serves the compiled Angular app with a local `/api/**` proxy to Django on port 8000. After source edits, run `npm run build` and refresh the page. Angular's hot-reload server is also available with `npm run dev` in environments where its file watcher can access the project tree.

To build or preview separately, use:

```powershell
npm run build
npm run preview
```

Run the frontend utility tests with `npm test`. The browser flow was manually checked against a local SQLite demo database: sign in, view elections, select and confirm a candidate, refresh to confirm the vote persisted, and view a closed election's results. Neon connectivity still needs verification with the group's connection string.

## API contract

All election endpoints require a signed-in session. Use the Angular development proxy so browser requests to `/api/` share one origin with the session and CSRF cookie.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/auth/csrf/` | Get a CSRF token and cookie |
| POST | `/api/auth/login/` | Sign in with JSON `username` and `password` |
| POST | `/api/auth/logout/` | Sign out |
| GET | `/api/auth/me/` | Check the current session |
| GET | `/api/elections/` | List published elections |
| GET | `/api/elections/{id}/` | Get election and candidates |
| POST | `/api/elections/{id}/vote/` | Vote with JSON `candidate_id` |
| GET | `/api/elections/{id}/results/` | Get counts after closing |

Send `X-CSRFToken: <csrfToken>` on POST requests. After login, fetch a fresh token. The voting endpoint returns `201` when a ballot is recorded; validation failures return `400`, and unauthorized requests return `403`.

## Scope

Each account can cast one ballot in each election. An election has one candidate list and one winner; multiple positions, self-registration, email verification, and anonymous ballots are outside this MVP. Vote records link voters to candidates, so this is a classroom prototype and does not provide secret ballots.
