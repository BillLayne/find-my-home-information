# Find My Home Information

Consumer-facing North Carolina property resource from Bill Layne Insurance Agency.

- Live site: https://find-my-home-information.pages.dev/
- GitHub: https://github.com/BillLayne/find-my-home-information

The application accepts an address and organizes available public property details, county records, map/photo destinations, flood resources, and agency tools. It does not expose NC Insurance Tools staff notes, uploads, documents, contact fields, or workflow data.

## Development

```powershell
npm install
npm run dev
```

The Vite development server runs at `http://localhost:4175`. Its `/api/property` proxy forwards lookup requests to the existing NC Insurance Tools public API, and the browser applies the same consumer-safe mapper used by the Cloudflare Function.

## Verification

```powershell
npm test
npm run lint
npm run build
```

To test the Cloudflare Pages Function locally after building:

```powershell
npm run build
npm run cf:dev
```

## Architecture

- React/Vite frontend
- Cloudflare Pages Functions
- Existing NC Insurance Tools `/api/lookup` endpoint remains the county-data source of truth
- No D1 binding and no customer address persistence
- Consumer-safe response mapping in `shared/property.ts`

## Deployment

Cloudflare Pages project: `find-my-home-information`

```powershell
npm run build
npm run cf:deploy
```

The GitHub workflow can deploy after these repository secrets are configured:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Recommended future custom domain: `homeinfo.billlayneinsurance.com`.
