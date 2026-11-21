# Fox 🦊 Finance
Live stocks, crypto and currencies with charts and news, built in the Fox 🦊 Verse.
Branding: the logo and icons in `public/` come from the Fox Finance poster (logo.jpg, icon-*.png).

## Structure
- `public/` – the website (index.html, style.css, app.js, logo and icons, manifest)
- `netlify/functions/api.js` – serverless proxy to Yahoo Finance (no API key needed)
- `netlify.toml` – tells Netlify where everything is

## Deploy on Netlify (via GitHub)
1. Create a GitHub repo and upload all these files, keeping the folders.
2. On Netlify: Add new site → Import an existing project → pick the repo.
3. Leave the build command empty. Publish directory is already `public` from netlify.toml.
4. Deploy. The site and the `/api` function go live together.

## Run locally
`npm i -g netlify-cli` then `netlify dev`

## Notes
Data comes from Yahoo Finance's unofficial public endpoints and may be delayed up to 15 minutes.
If you later need a guaranteed feed, swap the fetch calls in `api.js` for Finnhub or Twelve Data
and keep the key in a Netlify environment variable.
