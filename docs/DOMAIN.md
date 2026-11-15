# Our own domain: aitakeoff.eu

The game is served by GitHub Pages from the `gh-pages` branch. Until a `CNAME` file exists at the repo root it lives at
https://damienlethiec.github.io/takeoff-middle-power/ (previews under `…/preview/<branch>/`). With the `CNAME` file it
moves to the root of our own domain: https://aitakeoff.eu/ (previews under `https://aitakeoff.eu/preview/<branch>/`),
and the old github.io address redirects there. The deploy workflow (`.github/workflows/deploy.yml`) reads the file,
builds with the right base path and writes `CNAME` at the root of `gh-pages`. Local builds, the end-to-end tests and the
accessibility runs keep `/takeoff-middle-power/` (Vite's default base): nothing changes there.

## Switching over, in this order

1. **First, verify the domain on GitHub (prevents a takeover).** GitHub → your profile Settings → Pages →
   Add a domain → `aitakeoff.eu`, then add the TXT record it shows (`_github-pages-challenge-damienlethiec`) at OVH
   and click Verify. Do this before pointing the domain at GitHub: once it points there, any GitHub account could
   otherwise claim it for its own Pages site until ours does. Never add a wildcard record (`*.aitakeoff.eu`) towards GitHub.
2. **Then the DNS, at the registrar (OVH, zone `aitakeoff.eu`).** Delete the default records OVH created for the apex and for
   `www` (A, AAAA, CNAME), then add:

   | Sub-domain | Type  | Target                    |
   | ---------- | ----- | ------------------------- |
   | (empty)    | A     | 185.199.108.153           |
   | (empty)    | A     | 185.199.109.153           |
   | (empty)    | A     | 185.199.110.153           |
   | (empty)    | A     | 185.199.111.153           |
   | (empty)    | AAAA  | 2606:50c0:8000::153       |
   | (empty)    | AAAA  | 2606:50c0:8001::153       |
   | (empty)    | AAAA  | 2606:50c0:8002::153       |
   | (empty)    | AAAA  | 2606:50c0:8003::153       |
   | www        | CNAME | damienlethiec.github.io.  |

3. **Wait for the DNS** (minutes to a few hours): `dig +short aitakeoff.eu` must list the four 185.199.x.153 addresses.
4. **Add the `CNAME` file** at the repo root on `main` (one line: `aitakeoff.eu`) and push. The deploy rebuilds the site
   for the new root. Branches that should keep a working preview (`theme-boardgame`, `theme-newspaper`) need the same
   file and this workflow: older previews built for the github.io path stop working at the new address.
5. **Repo Settings → Pages**: the custom domain shows `aitakeoff.eu` (type it there if it does not) and the DNS check
   passes; once GitHub has issued the certificate (up to an hour or so), tick **Enforce HTTPS**.

## What changes for players

- The address. Old links to github.io keep working (GitHub redirects them).
- Saved progress (the game in progress, the tutorial state, language and sound choices) is kept per address by the
  browser: a player who comes back on aitakeoff.eu starts fresh once.
