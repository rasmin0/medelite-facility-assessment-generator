# Medelite Facility Assessment Snapshot

This is a lightweight, dependency-free web app for the Medelite Healthcare Data Automation case study.

## What It Does

- Accepts a CMS Certification Number (CCN).
- Fetches the current CMS Provider Data Catalog nursing home Provider Information CSV.
- Finds the matching nursing facility.
- Populates public CMS fields such as location, certified beds, average residents per day, and star ratings.
- Lets the user enter internal Medelite operational fields, including manual current census.
- Supports an optional facility display-name override.
- Downloads a clean PDF snapshot with the required `INFINITE - Managed by MEDELITE` branding.
- Includes a clickable Medicare Care Compare source link in the PDF.

## Run Locally

Start the local server:

```bash
node server.js
```

Then visit:

```text
http://localhost:4173
```

The app opens blank. Use this validation CCN to test the dynamic lookup:

```text
686123
```

## Deployment

This project has no package install step. Deploy it as a small Node web service on Render, Railway, Fly.io, or any host that can run:

```bash
node server.js
```

## Engineering Assumptions

- The MVP uses the CMS Provider Information dataset for the required public fields.
- Hospitalization and ED fields use the case-study sample values only for the validation CCN `686123`; other CCNs show `N/A` until the optional claims-measure bonus mapping is implemented.
- The app resolves the current Provider Information CSV URL through the CMS metastore API and falls back to the May 2026 CSV if the metastore request is unavailable.
