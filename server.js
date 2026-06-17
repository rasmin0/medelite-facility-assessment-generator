const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4173);
const APP_DIR = path.join(__dirname, "app");
const CMS_METASTORE_URL = "https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items";
const PROVIDER_DATASET_ID = "4pq5-n9py";
const FALLBACK_PROVIDER_CSV =
  "https://data.cms.gov/provider-data/sites/default/files/resources/38f631a211bad946a404d39a1c66d599_1778861765/NH_ProviderInfo_May2026.csv";

const cmsFieldMap = {
  ccn: "CMS Certification Number (CCN)",
  providerName: "Provider Name",
  address: "Provider Address",
  city: "City/Town",
  state: "State",
  zip: "ZIP Code",
  certifiedBeds: "Number of Certified Beds",
  avgResidents: "Average Number of Residents per Day",
  overallRating: "Overall Rating",
  healthInspectionRating: "Health Inspection Rating",
  staffingRating: "Staffing Rating",
  qmRating: "QM Rating"
};

let providerRowsPromise;

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/facility") {
      await handleFacilityLookup(url, response);
      return;
    }

    serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Facility assessment app running at http://localhost:${PORT}`);
});

async function handleFacilityLookup(url, response) {
  const ccn = (url.searchParams.get("ccn") || "").trim();

  if (!/^\d{6}$/.test(ccn)) {
    sendJson(response, 400, { error: "A valid 6-digit CCN is required." });
    return;
  }

  const rows = await getProviderRows();
  const row = rows.find((item) => clean(item[cmsFieldMap.ccn]) === ccn);

  if (!row) {
    sendJson(response, 404, { error: "Facility not found." });
    return;
  }

  sendJson(response, 200, normalizeFacility(row));
}

async function getProviderRows() {
  if (!providerRowsPromise) {
    providerRowsPromise = fetchCurrentProviderCsv()
      .then(parseCsv)
      .then((rows) => rows.filter((row) => row[cmsFieldMap.ccn]));
  }

  return providerRowsPromise;
}

async function fetchCurrentProviderCsv() {
  try {
    const metadataResponse = await fetch(CMS_METASTORE_URL);
    if (!metadataResponse.ok) {
      return fetchText(FALLBACK_PROVIDER_CSV);
    }

    const datasets = await metadataResponse.json();
    const providerDataset = datasets.find((item) => item.identifier === PROVIDER_DATASET_ID);
    const csvUrl = providerDataset?.distribution?.find((item) => item.mediaType === "text/csv")?.downloadURL;
    return fetchText(csvUrl || FALLBACK_PROVIDER_CSV);
  } catch (error) {
    console.warn("Falling back to pinned CMS CSV:", error.message);
    return fetchText(FALLBACK_PROVIDER_CSV);
  }
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }

  return response.text();
}

function serveStatic(rawPathname, response) {
  const pathname = rawPathname === "/" ? "/index.html" : rawPathname;
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(APP_DIR, safePath);

  if (!filePath.startsWith(APP_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function contentType(filePath) {
  const extension = path.extname(filePath);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8"
  };

  return types[extension] || "application/octet-stream";
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ""]))
  );
}

function normalizeFacility(row) {
  const state = clean(row[cmsFieldMap.state]);
  const city = titleCase(clean(row[cmsFieldMap.city]));
  const address = titleCase(clean(row[cmsFieldMap.address]));
  const zip = clean(row[cmsFieldMap.zip]);

  return {
    ccn: clean(row[cmsFieldMap.ccn]),
    providerName: titleCase(clean(row[cmsFieldMap.providerName])),
    location: [address, city, state, zip].filter(Boolean).join(", "),
    state,
    certifiedBeds: clean(row[cmsFieldMap.certifiedBeds]),
    avgResidents: clean(row[cmsFieldMap.avgResidents]),
    overallRating: clean(row[cmsFieldMap.overallRating]),
    healthInspectionRating: clean(row[cmsFieldMap.healthInspectionRating]),
    staffingRating: clean(row[cmsFieldMap.staffingRating]),
    qmRating: clean(row[cmsFieldMap.qmRating])
  };
}

function clean(value) {
  return String(value ?? "").trim();
}

function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
    .replace(/\b(Sw|Se|Ne|Nw)\b/g, (match) => match.toUpperCase());
}
