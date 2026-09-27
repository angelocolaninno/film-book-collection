# Still — Film & Book Collection

A small personal archive for films watched and books read. The app is local-first: the collection is stored in this browser with IndexedDB, and a JSON backup can be exported or imported at any time.

The current version works without API accounts or keys. Add entries manually, including an optional artwork URL. Metadata search is a later step; provider adapters are not connected to the interface yet.

## Stack

- React and TypeScript
- Vite
- Browser IndexedDB behind a small collection repository
- Optional metadata providers planned: TMDB for films and Google Books for books
- GitHub Pages for static hosting

Google Books is the planned book provider because its public volumes API supports title search and returns authors, publication data, publisher, and cover links. TMDB is the planned film provider because it supplies structured film credits. API search is currently switched off while the core collection experience is built.

## Local setup

1. Install Node.js 20 or newer.
2. Install dependencies and start the app:

   ```sh
   npm install
   npm run dev
   ```

Build the static site with `npm run build`; preview it locally with `npm run preview`. No `.env` file is needed for the current version.

## API credentials and privacy

When metadata search is connected, TMDB's v3 API key and a Google Books API key can be configured in `.env` for local development and as GitHub Actions variables for a Pages build. Vite embeds client variables in frontend JavaScript, where visitors can inspect and use them; treat them as public identifiers, not private secrets. Never put a private server credential in this project.

See the provider instructions for [TMDB application authentication](https://developer.themoviedb.org/docs/authentication-application) and [Google Books request identification](https://developers.google.com/books/docs/v1/using#auth).

The current interface makes no metadata API requests. When Google Books search is enabled, requests will be made directly from the browser. Google may apply quotas or change availability. A static GitHub Pages app cannot keep credentials secret. A public or higher-traffic deployment that needs protected credentials or server-controlled provider requests needs a server-side proxy and corresponding privacy/security review.

Before TMDB search is enabled, add the approved logo and required attribution notice to the app. See [TMDB's attribution guidance](https://developer.themoviedb.org/docs/faq) and [API terms](https://www.themoviedb.org/api-terms-of-use). This personal, non-commercial project should be reviewed again before any commercial use.

Your personal notes and dates are stored in IndexedDB on the current browser profile. They are not sent to any metadata provider. Browser data is not synced across devices and may be cleared by the user or browser, so export backups regularly.

## Backup and restore

Open the gear menu to export a JSON backup or import one. Import validates the file shape before changing the collection. When entries already exist, the app asks whether to merge or replace; replacement requires a second confirmation. Keep the downloaded file somewhere safe. Backups may contain private notes.

## PWA and offline use

The app has a web manifest, install icon, and a small service worker that caches the application shell and same-origin built files. The collection stays in IndexedDB and can be read while offline after the app has loaded once. Manually added artwork hosted elsewhere may need an earlier browser cache entry to appear offline.

## GitHub Pages deployment

The included Actions workflow builds the app on pushes to `main` and deploys it to Pages. In the repository settings, enable **Pages → GitHub Actions**. The current build requires no API variables. The Vite base path is set to `/film-book-collection/` in Actions builds, matching this repository name. Local development and preview use `/`.

## Data model

The React UI calls `collectionRepository`; only that repository talks to IndexedDB. `CollectionItem` holds personal dates, context/format, notes, and normalized metadata. This boundary keeps persistence replaceable later without coupling UI components to a storage vendor. There is no account, remote database, or multi-user support in V1.

## Design source

`DESIGN.md` defines the visual tokens, type, spacing, artwork treatment, responsive layout, and accessibility principles used by the interface.
