# CommonGround voter frontend

The Angular app connects to the Django REST API in `../backend/`. It provides a public home page, voter sign-in, election cards, a candidate ballot with a review step, vote confirmation, and closed-election results.

## Run locally

Start Django at `http://127.0.0.1:8000`, then run:

```powershell
npm install
npm run build
npm start
```

Open `http://127.0.0.1:4200/`. `npm start` serves the compiled app with a local `/api/**` proxy to Django. Requests use Django session authentication and send `X-CSRFToken` on login, vote, and logout. Rebuild after source edits with `npm run build`, then refresh the page. For hot reload, `npm run dev` uses Angular's development server when its file watcher is available.

For a compiled preview with the same API proxy:

```powershell
npm run build
npm run preview
```

Run utility tests with `npm test`. The app uses Angular 21 because it supports the current Node 24.13 installation in this workspace.

The card layout is an initial design direction. The Power Apps mockup is on another laptop and has not yet been available for direct comparison.
