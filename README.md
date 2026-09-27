# Still — Film & Book Collection

A small personal archive for films watched and books read. The app is local-first: the collection is stored in this browser with IndexedDB, and a JSON backup can be exported or imported at any time.

Films can be searched with TMDB and books with Google Books. You can also enter either type manually if a provider is unavailable. The collection itself is local-first and stored in this browser with IndexedDB.

## Stack

- React and TypeScript
- Vite
- Browser IndexedDB behind a small collection repository
- TMDB for film search, posters, and credits
- Google Books for book search, covers, and publication details
- GitHub Pages for static hosting

Google Books is used because its public volumes API supports title search and returns authors, publication data, publisher, and cover links. TMDB supplies structured film credits, including director, cast, and cinematographer roles. Results are mapped into the app's own types in `src/metadata.ts`.

## Local setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and add your API keys.
3. Install dependencies and start the app:

   ```sh
   npm install
   npm run dev
   ```

Build the static site with `npm run build`; preview it locally with `npm run preview`.

## API credentials and privacy

TMDB's v3 API key and a Google Books API key are read from `.env` for local development. To use search on GitHub Pages, add the corresponding GitHub Actions **Variables** named `VITE_TMDB_API_KEY` and `VITE_GOOGLE_BOOKS_API_KEY`. Vite embeds these values in frontend JavaScript, where visitors can inspect and use them; treat them as public identifiers, not private secrets. Never put a private server credential in this project.

See the provider instructions for [TMDB application authentication](https://developer.themoviedb.org/docs/authentication-application) and [Google Books request identification](https://developers.google.com/books/docs/v1/using#auth).

Metadata requests are made directly from the browser. Google may apply quotas or change availability. A static GitHub Pages app cannot keep credentials secret. A public or higher-traffic deployment that needs protected credentials or server-controlled provider requests needs a server-side proxy and corresponding privacy/security review.

TMDB's approved logo and required attribution notice appear in the app's Credits area under Settings. See [TMDB's attribution guidance](https://developer.themoviedb.org/docs/faq) and [API terms](https://www.themoviedb.org/api-terms-of-use). This personal, non-commercial project should be reviewed again before any commercial use.

Your personal notes and dates are stored in IndexedDB on the current browser profile. They are not sent to metadata providers. Search requests contain the title you entered; posters and covers are loaded from the providers. Browser data is not synced across devices and may be cleared by the user or browser, so export backups regularly.

## Backup and restore

Open the gear menu to export a JSON backup or import one. Upload an image up to 15 MB; the browser resizes it to fit the collection and caps the stored image near 1.2 MB. Uploaded covers and posters are stored with each entry in IndexedDB and included in the backup file. Import validates the file shape and embedded artwork before changing the collection. When entries already exist, the app asks whether to merge or replace; replacement requires a second confirmation. Keep the downloaded file somewhere safe. Backups may contain private notes and artwork.

## PWA and offline use

The app has a web manifest, install icon, and a small service worker that caches the application shell and same-origin built files. The collection stays in IndexedDB and can be read while offline after the app has loaded once. Metadata search needs an internet connection; provider artwork may need an earlier browser cache entry to appear offline.

## GitHub Pages deployment

The included Actions workflow builds the app on pushes to `main` and deploys it to Pages. In the repository settings, enable **Pages → GitHub Actions**. Add `VITE_TMDB_API_KEY` and `VITE_GOOGLE_BOOKS_API_KEY` under **Settings → Secrets and variables → Actions → Variables** for search in the published build. The Vite base path is set to `/film-book-collection/` in Actions builds, matching this repository name. Local development and preview use `/`.

## Data model

The React UI calls `collectionRepository`; only that repository talks to IndexedDB. `CollectionItem` holds personal dates, context/format, notes, normalized metadata, and uploaded artwork. Artwork is resized in the browser and kept as an image data URL in the existing record, so no additional database or cloud storage is needed. JSON export/import carries that image data with the rest of each entry. There is no account, remote database, or multi-user support in V1.

## Design source

`DESIGN.md` defines the visual tokens, type, spacing, artwork treatment, responsive layout, and accessibility principles used by the interface.
