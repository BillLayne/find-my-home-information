# Find My Home Information — AI Handoff

Last updated: 2026-08-18

- **Live site:** https://find-my-home-information.pages.dev/
- **GitHub repo:** https://github.com/BillLayne/find-my-home-information
- **Cloudflare Pages project:** `find-my-home-information`
- **Local path:** `C:\Users\bill\OneDrive\Documents\Playground\find-my-home-information`

### Read this first (cross-project canonical)
`C:\Users\bill\OneDrive\Documents\Playground\nc-insurance-tools\NC_TOOLS_FIND_MY_HOME_HANDOFF.md`
— the single source of truth for the shared county engine, coverage, privacy rules, and the required deploy order. This file covers the **consumer app** specifically.

---

## Purpose

The public, consumer-facing property resource for Bill Layne Insurance Agency. A visitor types a North Carolina address and gets available public property facts (values, year built, acreage, beds/baths where published) plus organized links to maps, aerial photos, flood/hazard resources, county records, and a quote CTA. It is being promoted on social media, so coverage of populated areas matters.

This is a **separate product** from the internal NC Insurance Tools staff app — do not merge the two or copy staff features here.

---

## Critical boundary — never break this

The consumer app owns **no county data**. It proxies one upstream route and sanitizes the response:

- Allowed upstream call: `POST https://nc-insurance-tools-gemini.pages.dev/api/lookup` (server-side only, from the Pages Function)

**Never expose** (none of these are ever requested or mapped): owner name, mailing address, city/state/zip of owner, DOB, mortgage, property notes, property history, uploaded photos, PDFs/documents, staff workflow/assignment data, D1 exports.

The sanitizer `shared/property.ts` → `buildPublicPropertyResponse()` is an **explicit allow-list**: it constructs the public object field-by-field and simply never reads `owner`, `mailingAddress`, or the owner city/state/zip fields, even though the upstream `/api/lookup` response contains them (the agency app is staff-facing). This is the strongest form of the guarantee — a new private field added upstream cannot leak here unless someone deliberately maps it. `tests/property.test.ts` locks this in; keep those tests green.

Verified 2026-08-05 against production for Johnston/Wayne/Franklin: response keys are values/deed/year/acres/links/officialAddress only — no owner, no mailing.

---

## Architecture

Request flow:

```
Browser (src/lib/api.ts)
  → POST /api/property                       (same-origin)
  → functions/api/property.ts                (Cloudflare Pages Function)
      → POST {PROPERTY_LOOKUP_URL}/api/lookup (nc-insurance-tools-gemini)
      → buildPublicPropertyResponse()          (shared/property.ts sanitizer)
  → sanitized JSON (Cache-Control: no-store, X-Robots-Tag: noindex)

Browser (src/lib/api.ts)
  → GET /api/counties                        (same-origin)
  → functions/api/counties.ts                (Cloudflare Pages Function)
      → GET {PROPERTY_LOOKUP_URL}/api/counties
      → count unique county IDs only
  → { count } (Cache-Control: no-store, X-Robots-Tag: noindex)
```

File map (all verified current):

- `src/App.tsx` — address search, premium result navigation, quick links, report actions, and consumer result UI
- `src/LegalPage.tsx` — `/privacy` and `/terms` routes
- `src/ParcelMap.tsx` — Leaflet + OpenStreetMap parcel highlight (consumer-safe: only parcel rings, searched lat/lon, match method)
- `src/index.css` — styling
- `src/lib/api.ts` — browser calls to the same-origin `/api/property` and `/api/counties` proxies
- `shared/property.ts` — response types, URL protocol validation, the safe upstream→public mapper, FEMA link builder
- `shared/coverage.ts` — safe upstream county-URL builder + unique county counter
- `functions/api/property.ts` — the proxy (15s timeout, forwards `{address}`, applies sanitizer, sets no-store/noindex headers)
- `functions/api/counties.ts` — coverage-count proxy (8s timeout; returns only `{count}`; never exposes the upstream list)
- `functions/api/health.ts` — `GET /api/health` → `{ ok: true }`
- `tests/property.test.ts` — privacy + link-generation regression tests
- `tests/coverage.test.ts` — coverage URL and unique-count regression tests

No D1, no database, no persistence of searched addresses. Config is one Pages var: `PROPERTY_LOOKUP_URL` (in `wrangler.toml`), defaulting to the agency `/api/lookup` if unset.

Behavioral notes:
- Street-address comparison (`recordAddressDiffers`) intentionally compares **only the street line** (abbreviation-normalized), ignoring the geocoder's added city/state/zip. Do not restore a full-string compare — it wrongly flags matching records as different addresses.
- When a county returns no parcel, the UI shows a limited-data notice + statewide FEMA/ReadyNC/flood links rather than a grid of empty boxes.
- `officialAddress` = upstream `siteAddress` (the real property address, injected by the engine — including the two-step counties). Falls back to the geocoded address when absent.
- The sticky report navigator links to Overview, Home links, Parcel map when available, Photos, Hazards, and Records. Desktop includes a New address control; the fixed mobile action dock already supplies this action on small screens.
- "Your home links" keeps the most useful destinations directly below the property summary: county GIS/parcel, property card when available, Google Maps/Street View, and FEMA.
- The tax-value/rebuild-cost explanation is intentionally compact and expands through "Learn why." Print output always expands it.
- Print / Save PDF uses the browser print dialog. Share report uses the native Web Share API when available and copies a deep link otherwise. Deep links use `?address=` and do not persist a search history.

---

## Coverage

**53 counties** integrated for automatic parcel details as verified on 2026-08-18. This now covers every NC 100k+ population market; upstream expansion is switching to add-on-demand (new counties only when a real quote needs one).

**`GET https://nc-insurance-tools-gemini.pages.dev/api/counties` is authoritative** — it returns the live list. Never claim automated details for all 100 counties. Statewide FEMA/flood/ReadyNC/map links are always provided even without a county record.

County adapters are **never** duplicated here. A county is built + deployed in NC Insurance Tools first; this app inherits it through `/api/lookup`. The visible count is fetched through the privacy-safe same-origin `/api/counties` endpoint and falls back to the `coverageCount` initial state in `src/App.tsx` (currently 53) if the count service is temporarily unavailable, so normal coverage additions do not require a consumer UI edit.

Current 53: Alamance, Alexander, Alleghany, Ashe, Avery, Brunswick, Buncombe, Burke, Cabarrus, Caldwell, Caswell, Catawba, Chatham, Cleveland, Craven, Cumberland, Davidson, Davie, Durham, Forsyth, Franklin, Gaston, Guilford, Harnett, Haywood, Henderson, Iredell, Jackson, Johnston, Lee, Lincoln, Mecklenburg, Moore, Nash, New Hanover, Onslow, Orange, Pitt, Randolph, Robeson, Rockingham, Rowan, Sampson, Stanly, Stokes, Surry, Union, Wake, Watauga, Wayne, Wilkes, Wilson, Yadkin.

---

## Deploy

**Required order: upstream first.** If a change depends on new county data, deploy `nc-insurance-tools` before this app. Deploying the consumer alone is fine for UI/copy-only changes.

Two deploy paths:

1. **Manual (wrangler)** — the reliable path:
   ```bash
   npm run build && npm run cf:deploy
   ```
   (`cf:deploy` = `wrangler pages deploy dist --project-name find-my-home-information`)

2. **GitHub Actions** (`.github/workflows/deploy.yml`) — runs `test → lint → build → deploy` on push to `main`, but the deploy step only fires if the repo secret `CLOUDFLARE_API_TOKEN` (+ `CLOUDFLARE_ACCOUNT_ID`) is set. Treat manual wrangler as the source of truth unless you've confirmed the secrets exist.

**GOTCHA (hit 2026-08-05):** wrangler's cached Cloudflare OAuth login can expire mid-session and fail with `Failed to fetch auth token: 400 Bad Request`. Fix: run `wrangler login` in a real terminal window (it opens a browser to approve), then re-run the deploy. This is not a code problem.

**GOTCHA:** Cloudflare Pages **Functions** take ~30–60s to propagate after deploy, and the edge briefly serves the old bundle. Re-test with a cache-buster before concluding a deploy failed.

---

## Commands

```bash
npm install
npm run dev        # Vite dev server on http://localhost:4175 (proxies /api/property to the live agency API)
npm test           # privacy + link tests (tsx --test)
npm run lint       # tsc --noEmit
npm run build      # vite build → dist
npm run cf:dev     # test the Pages Function locally against the built dist
npm run cf:deploy  # deploy dist to Cloudflare Pages
```

Live smoke test (production):
```bash
curl -s -X POST https://find-my-home-information.pages.dev/api/property \
  -H "Content-Type: application/json" -d '{"address":"395 Spaniel Ln, Clayton, NC 27520"}'

curl -s https://find-my-home-information.pages.dev/api/counties
```
Confirm the property JSON has no `owner`/`mailing` keys and the county response contains only `{"count":N}`.

---

## Do Not Break

- Server-side proxy boundary (browser never calls the agency API directly)
- Owner / mailing-address omission in `shared/property.ts`
- `Cache-Control: no-store` and `X-Robots-Tag: noindex` on API responses
- Same-origin county-count proxy returns only the integer count, never the upstream county list
- External URL protocol validation (`safeUrl` — only http/https pass through)
- Single upstream source of truth in NC Insurance Tools (no duplicated county adapters)
- Street-only address comparison (don't restore full-string compare)
- Green `tests/property.test.ts`

---

## Recent changes

- **2026-08-16** — Premium consumer UX pass: sticky report navigation, immediate home-resource shortcuts, compact expandable rebuild-cost education, print/save-PDF and share/deep-link controls, desktop call action, larger premium containers, responsive mobile refinements, and a privacy-safe dynamic county count. Full and limited-data address flows verified locally at desktop and phone widths.
- **2026-08-05** — Bumped integrated-county copy 35 → 41 after the agency engine added six eastern counties (Cumberland, Chatham, Wayne, Johnston, Orange, Franklin) for the social-media promotion. No consumer-side code changed beyond the count; privacy filter re-verified live for the new counties. Commit `365ed8e`.

## Pending / next phase

- Custom domain (recommended `homeinfo.billlayneinsurance.com`) + canonical URL
- Final branded hero/property imagery
- GA4 + Microsoft Clarity event tracking
- Managed Cloudflare Turnstile once production widget keys exist
- Statewide unsupported-county fallback directory
- Browser audit of every county's GIS / parcel-card / deed / aerial destination links
