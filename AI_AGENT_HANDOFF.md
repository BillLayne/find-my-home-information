# Find My Home Information — AI Handoff

Last updated: 2026-09-06

## Current release: live and verified

The user explicitly approved publishing the 2026-09-06 frontend revision. It is now deployed and verified at https://find-my-home-information.pages.dev/.

- Release code commit: `17c6b8c` (`Improve consumer property report and mobile search workflow`).
- Cloudflare production deployment: `b2503154`, https://b2503154.find-my-home-information.pages.dev/.
- Production bundle verified: `assets/index-BQC2tRSm.js` and `assets/index-CQN7LKZn.css`.
- Live smoke checks passed: main page HTTP 200, `/api/health`, Lee and Watauga lookups, visible property facts and destination labels, desktop/mobile report rendering, and privacy-safe `no-store` response. Screenshots: `output/playwright/live-report-desktop.png` and `live-report-mobile.png`.
- Future changes still require explicit deployment approval. County deep-link repairs remain a separate upstream task.

- Preview: `http://127.0.0.1:4186/` (local Wrangler Pages development server, running the built `dist` and the real Pages Functions).
- Start again if needed: `npm run build`, then `npm run cf:dev -- --port 4186 --ip 127.0.0.1`.
- Existing desktop/mobile hero and four supporting WebP images are retained. Initial search is more compact; a successful search becomes a focused report without the large hero.
- Facts and four compact shortcuts precede agency calls to action. Desktop has active-section navigation; tablet/phone use an accessible section selector. All report sections remain available.
- Inline address editing retains the previous report through validation errors, empty results, outages, and canceled requests. Abort handling prevents a late canceled response from replacing the current report. No search history is saved.
- Detailed GIS/aerial links now appear once in Records, rather than also in Photos. Compact shortcuts and the map's source link are intentionally retained.
- Property-specific URL labels require the current parcel identifier in the URL. Address searches and general destinations have distinct labels. These are conservative URL classifications, **not a guarantee that a third-party site loads correctly**.
- Copy address/parcel controls have status announcements and a selectable fallback when clipboard access is blocked. For a county-address mismatch, Copy address uses the county's displayed address.
- Share links optionally include a public `parcel` identifier to restore the selected candidate. Incoming share parameters are consumed after lookup; no local storage or database was added.
- Agency CTAs still use `/home-quote` with address/ZIP/county, never the old mailto or redirecting `.html` URL. The former "Email this property" label is corrected.
- Backend Functions, shared sanitizer, county adapters, authentication, deployment configuration, and public-data boundaries are unchanged. Only the browser API wrapper gained an optional AbortSignal.

### Verification completed on 2026-09-06

- `npm test`: 12 passing tests (existing 7 plus 5 frontend-helper regressions).
- `npm run lint`: TypeScript passes. `npm run build`: production build passes. `git diff --check`: passes.
- Real local-Function lookups: Lee (`800 Creekwood Rd, Sanford, NC 27330`) and Watauga (`104 Mockingbird Ln, Blowing Rock, NC`). Public response excludes private fields; no-store/noindex headers verified.
- Playwright: desktop 1440px, tablet 820px, phone 390px, narrow phone 320px. Landing/report fit checked, including all eight facts and unusually long record text. Screenshots visually reviewed.
- Browser-only mock responses exercised service errors, empty results, limited records, multiple candidates, shared-candidate selection, delayed requests and cancellation. These fixtures are not in the application bundle.
- Tested copy/share branches using browser API stubs (including clipboard failure), the print action invoking `window.print`, and print CSS revealing the tax explanation while hiding controls. Physical printer output and real mobile OS share sheets remain unverified.
- Privacy/Terms routes, loaded image assets, visible inline errors, keyboard focus, and mobile section navigation checked. No dark theme existed; none was added.
- Screenshots and preview logs: `output/playwright/` (gitignored).

### Remaining integration boundary

Lee's supplied GIS link still opens the generic county map. This revision labels it honestly and provides copy controls; it does **not** repair upstream deep links or audit every county. Any county adapter/deep-link fixes belong in NC Insurance Tools and require separate integration work. Do not report that all counties now direct-link successfully.

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

- `src/App.tsx` — initial address search, inline report editor, lookup/cancel state, consumer landing page
- `src/PropertyReport.tsx` — report facts, section navigation, resource groups, copy/share/print, and agency actions
- `src/lib/report.ts` — frontend URL classification, search validation, and public share-link construction
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
- `tests/report.test.ts` — frontend URL classification, input validation, and share-link regression tests

No D1, no database, no persistence of searched addresses. Config is one Pages var: `PROPERTY_LOOKUP_URL` (in `wrangler.toml`), defaulting to the agency `/api/lookup` if unset.

Behavioral notes:
- Street-address comparison (`recordAddressDiffers`) intentionally compares **only the street line** (abbreviation-normalized), ignoring the geocoder's added city/state/zip. Do not restore a full-string compare — it wrongly flags matching records as different addresses.
- When a county returns no parcel, the UI shows a limited-data notice + statewide FEMA/ReadyNC/flood links rather than a grid of empty boxes.
- `officialAddress` = upstream `siteAddress` (the real property address, injected by the engine — including the two-step counties). Falls back to the geocoded address when absent.
- The local revision's sticky navigator links to Overview, Parcel map when available, Records, Photos, Hazards, and Resources. Tablet/phone have a section selector; Change address opens an inline editor. The original `#home-links` anchor remains supported.
- Property shortcuts immediately follow the facts: property card when available, county GIS/aerial map, Google Maps/Street View, and FEMA.
- The tax-value/rebuild-cost explanation is intentionally compact and expands through "Learn why." Print output always expands it.
- Print / PDF uses the browser print dialog. Share report uses the native Web Share API when available and copies a deep link otherwise. Deep links use `?address=` with an optional public `parcel` identifier and do not persist an application search history.

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

- **2026-09-06** — Consumer frontend workflow and accessibility revision published with explicit user approval. Existing data engine and imagery preserved. Production deployment `b2503154` and the main domain verified after release.

- **2026-08-16** — Premium consumer UX pass: sticky report navigation, immediate home-resource shortcuts, compact expandable rebuild-cost education, print/save-PDF and share/deep-link controls, desktop call action, larger premium containers, responsive mobile refinements, and a privacy-safe dynamic county count. Full and limited-data address flows verified locally at desktop and phone widths.
- **2026-08-05** — Bumped integrated-county copy 35 → 41 after the agency engine added six eastern counties (Cumberland, Chatham, Wayne, Johnston, Orange, Franklin) for the social-media promotion. No consumer-side code changed beyond the count; privacy filter re-verified live for the new counties. Commit `365ed8e`.

## Pending / next phase

- Custom domain (recommended `homeinfo.billlayneinsurance.com`) + canonical URL
- Final branded hero/property imagery
- GA4 + Microsoft Clarity event tracking
- Managed Cloudflare Turnstile once production widget keys exist
- Statewide unsupported-county fallback directory
- Browser audit of every county's GIS / parcel-card / deed / aerial destination links
