# Deployment

## Cloudflare Pages

Connect the GitHub repository `osg1991/stotra-sadhana` to Cloudflare Pages.

Use these settings:

```text
Production branch: main
Framework preset: None
Build command: npm run build
Build output directory: /
Root directory: /
Node version: 20
```

Cloudflare Pages will deploy the static files from the repository root after validation and tests complete.

The application is local-first. The service worker caches the application shell after the first successful visit. SRS progress remains in the browser's local storage and is not uploaded to a server.

## Local run

```bash
npm run build
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Deployment sequence

1. Merge the feature pull request into `main`.
2. Create the Cloudflare Pages project and connect this repository.
3. Apply the settings above.
4. Deploy.
5. Open the site once online to populate the offline cache.
