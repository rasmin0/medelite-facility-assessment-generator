# Medelite Facility Assessment Snapshot

A lightweight Node web app for the Medelite Healthcare Data Automation case study. The app lets a user enter a CMS Certification Number (CCN), pulls public CMS nursing home data, combines it with manual Medelite operational inputs, and downloads a branded facility assessment PDF.

## Live Links

- Live app: https://medelite-facility-assessment-generator.onrender.com/
- GitHub repo: https://github.com/rasmin0/medelite-facility-assessment-generator

## Tech Stack

- Node.js
- Vanilla HTML, CSS, and JavaScript
- CMS Provider Data Catalog
- Render

## What It Does

- Accepts a CMS Certification Number (CCN).
- Fetches the current CMS Provider Data Catalog nursing home Provider Information CSV.
- Finds the matching nursing facility.
- Populates public CMS fields such as facility name, location, certified beds, average residents per day, and star ratings.
- Lets the user enter internal Medelite operational fields, including manual current census.
- Supports an optional facility display-name override.
- Downloads a branded, print-ready PDF snapshot with `INFINITE - Managed by MEDELITE` branding.
- Includes a clickable Medicare Care Compare source link in the PDF.
- Handles invalid CCNs, no-match lookups, and CMS request failures with user-facing messages.

## Usage

1. Enter a 6-digit CMS Certification Number (CCN).
2. Click **Search Facility** to load public CMS data.
3. Fill in the manual Medelite operational fields.
4. Optionally enter a custom facility display name.
5. Click **Download PDF** to generate the facility assessment snapshot.

## Run Locally

Start the local server:

```bash
npm start
```

Then visit:

```text
http://localhost:4173
```

The app opens blank. Use this validation CCN to test the dynamic lookup:

```text
686123
```

## Validation Case

Use CCN `686123` to test the Kendall Lakes Healthcare and Rehab Center validation case from the case materials.

## Deployment

This project has no external npm dependencies. Deploy it as a small Node web service on Render, Railway, Fly.io, or any host that can run:

```bash
npm start
```

Render start command:

```bash
npm start
```

## Engineering Assumptions

- The required MVP fields use the CMS Provider Information dataset.
- `Census Capacity` maps to `Number of Certified Beds`.
- `CMS Average Residents/Day` is shown separately from manual `Current Census` so the app does not mislabel CMS average residents as a live internal census.
- Hospitalization and ED metrics use the case-study sample values only for validation CCN `686123`; other CCNs show `N/A` until the optional claims-measure bonus mapping is implemented.
- The app resolves the current Provider Information CSV URL through the CMS metastore API and falls back to the May 2026 CSV if the metastore request is unavailable.
- Star ratings may differ from the provided sample PDF because the app uses current CMS public data.

## Project Structure

```text
app/
  index.html
  styles.css
  app.js
server.js
package.json
README.md
```
