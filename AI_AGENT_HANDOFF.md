# Find My Home Information - AI Handoff

Last updated: 2026-07-15

Canonical cross-project handoff:

- `C:\Users\bill\OneDrive\Documents\Playground\nc-insurance-tools\NC_TOOLS_FIND_MY_HOME_HANDOFF.md`
- Read it first for the single county-engine architecture, current coverage, privacy rules, and the required NC Tools -> consumer deployment order.

- Live site: https://find-my-home-information.pages.dev/
- GitHub repository: https://github.com/BillLayne/find-my-home-information
- Cloudflare Pages project: `find-my-home-information`

## Purpose

This is the separate consumer-facing property resource for Bill Layne Insurance Agency. A visitor enters a North Carolina address and receives available public property facts plus organized links to maps, photographs, hazards, county property records, and insurance resources.

Design is intentionally foundational in the first release. Preserve the functional architecture when the branded design pass begins.

## Critical Boundary

Do not copy or expose staff data from NC Insurance Tools.

Allowed upstream route:

- `POST https://nc-insurance-tools-gemini.pages.dev/api/lookup`

Never call or expose:

- property notes
- property history
- uploaded property photos
- PDFs/documents
- customer DOB or mortgage information
- staff workflow or assignment data
- D1 exports

The consumer sanitizer is `shared/property.ts`. It intentionally omits owner and mailing-address fields even though some county responses contain them.

## Architecture

- `src/App.tsx`: address search and consumer result UI
- `src/index.css`: current foundation styling
- `src/lib/api.ts`: browser call to the same-origin proxy
- `shared/property.ts`: response types, URL validation, safe upstream mapping, FEMA link generation
- `functions/api/property.ts`: Cloudflare proxy to NC Insurance Tools
- `functions/api/health.ts`: deployment health check
- `tests/property.test.ts`: privacy and link-generation regression tests

No D1 database is used. Searches are not intentionally persisted.

## Commands

```powershell
npm install
npm test
npm run lint
npm run build
npm run dev
npm run cf:deploy
```

## Product Sections

1. Address search
2. Public property summary
3. Photos and maps
4. Hazard resources
5. Official public records
6. Bill Layne Insurance resources and quote CTA

## Known Coverage Boundary

The upstream NC Insurance Tools engine currently has automatic county integrations for 31 counties. The live `/api/counties` route is authoritative. The consumer page must not claim full automated parcel details for all 100 counties until that is true. Statewide FEMA, ReadyNC, and map resources can still be provided when an automatic county record is unavailable.

County adapters are never duplicated here. A county is implemented and deployed in NC Insurance Tools first; this project inherits its results through `/api/lookup`, applies `shared/property.ts`, and then updates any stale presentation count/copy.

## Next Design Phase

- finalize the branded custom domain and canonical URL
- create final hero/property imagery
- add GA4 and Microsoft Clarity event tracking
- add managed Cloudflare Turnstile after production widget keys are created
- add a statewide unsupported-county fallback directory
- audit every county for direct GIS, parcel card, deed, and aerial destinations
- add print/save report behavior
- add custom domain, recommended `homeinfo.billlayneinsurance.com`

## Do Not Break

- server-side proxy boundary
- owner/mailing-address omission
- `Cache-Control: no-store`
- `X-Robots-Tag: noindex` on API responses
- external URL protocol validation
- single upstream source of truth in NC Insurance Tools
