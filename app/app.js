const fields = {
  ccn: document.querySelector("#ccn"),
  facilityName: document.querySelector("#facilityName"),
  facilityOverride: document.querySelector("#facilityOverride"),
  location: document.querySelector("#location"),
  certifiedBeds: document.querySelector("#certifiedBeds"),
  avgResidents: document.querySelector("#avgResidents"),
  emr: document.querySelector("#emr"),
  currentCensus: document.querySelector("#currentCensus"),
  patientType: document.querySelector("#patientType"),
  medeliteHistory: document.querySelector("#medeliteHistory"),
  providerPerformance: document.querySelector("#providerPerformance"),
  medicalCoverage: document.querySelector("#medicalCoverage")
};

const lookupButton = document.querySelector("#lookupButton");
const downloadButton = document.querySelector("#downloadButton");
const statusEl = document.querySelector("#status");
const stateBadge = document.querySelector("#stateBadge");
const previewList = document.querySelector("#previewList");

let activeFacility;

const kendallClaimsMetrics = {
  shortTermHospitalization: "18.7%",
  strNationalHospitalization: "21.5%",
  strStateHospitalization: "23.8%",
  strEdVisit: "13.9%",
  strEdNational: "11.6%",
  strEdState: "9.3%",
  ltHospitalization: "1.86",
  ltNationalHospitalization: "1.65",
  ltStateHospitalization: "1.95",
  ltEdVisit: "6.94",
  ltEdNational: "1.65",
  ltEdState: "1.21"
};

const emptyClaimsMetrics = {
  shortTermHospitalization: "N/A",
  strNationalHospitalization: "N/A",
  strStateHospitalization: "N/A",
  strEdVisit: "N/A",
  strEdNational: "N/A",
  strEdState: "N/A",
  ltHospitalization: "N/A",
  ltNationalHospitalization: "N/A",
  ltStateHospitalization: "N/A",
  ltEdVisit: "N/A",
  ltEdNational: "N/A",
  ltEdState: "N/A"
};

lookupButton.addEventListener("click", lookupFacility);
downloadButton.addEventListener("click", downloadPdf);

fields.ccn.addEventListener("input", () => {
  if (activeFacility) {
    clearLoadedFacility();
    setStatus("CCN changed. Click Search Facility to load the new facility.");
  }
});

Object.entries(fields).forEach(([name, field]) => {
  if (name !== "ccn") {
    field.addEventListener("input", renderPreview);
  }
});

renderPreview();

async function lookupFacility() {
  const ccn = fields.ccn.value.trim();
  if (!/^\d{6}$/.test(ccn)) {
    clearLoadedFacility();
    setStatus("Enter a valid 6-digit CCN.", true);
    return;
  }

  setStatus("Searching CMS Provider Data Catalog...");
  lookupButton.disabled = true;
  downloadButton.disabled = true;

  try {
    const response = await fetch(`/api/facility?ccn=${encodeURIComponent(ccn)}`);

    if (response.status === 404) {
      clearLoadedFacility();
      setStatus(`No active nursing home was found for CCN ${ccn}.`, true);
      return;
    }

    if (!response.ok) {
      throw new Error(`Facility lookup failed: ${response.status}`);
    }

    activeFacility = await response.json();
    fields.facilityName.value = activeFacility.providerName;
    fields.location.value = activeFacility.location;
    fields.certifiedBeds.value = activeFacility.certifiedBeds;
    fields.avgResidents.value = activeFacility.avgResidents;
    stateBadge.textContent = activeFacility.state || "--";
    downloadButton.disabled = false;
    setStatus(`Loaded ${activeFacility.providerName}.`);
    renderPreview();
  } catch (error) {
    console.error(error);
    clearLoadedFacility();
    setStatus("Could not load CMS data. Please try again in a moment.", true);
  } finally {
    lookupButton.disabled = false;
  }
}

function getReportRows() {
  if (!activeFacility) {
    return [];
  }

  const displayName = fields.facilityOverride.value.trim() || activeFacility.providerName;
  const claimsMetrics = activeFacility.ccn === "686123" ? kendallClaimsMetrics : emptyClaimsMetrics;

  return [
    ["Name of Facility", displayName],
    ["Location", activeFacility.location],
    ["EMR", fields.emr.value],
    ["Census Capacity", activeFacility.certifiedBeds],
    ["CMS Average Residents/Day", activeFacility.avgResidents],
    ["Current Census", fields.currentCensus.value],
    ["Type of Patient", fields.patientType.value],
    ["Previous Coverage from Medelite", fields.medeliteHistory.value],
    ["Previous Provider Performance from Medelite", fields.providerPerformance.value],
    ["Medical Coverage", fields.medicalCoverage.value],
    ["Overall Star Rating", activeFacility.overallRating],
    ["Health Inspection", activeFacility.healthInspectionRating],
    ["Staffing", activeFacility.staffingRating],
    ["Quality of Resident Care", activeFacility.qmRating],
    ["Short Term Hospitalization", claimsMetrics.shortTermHospitalization],
    ["STR National Avg. for Hospitalization", claimsMetrics.strNationalHospitalization],
    ["STR State National Avg. for Hospitalization", claimsMetrics.strStateHospitalization],
    ["STR ED Visit", claimsMetrics.strEdVisit],
    ["STR ED Visits National Avg.", claimsMetrics.strEdNational],
    ["STR ED Visits State Avg.", claimsMetrics.strEdState],
    ["LT Hospitalization", claimsMetrics.ltHospitalization],
    ["LT National Avg. for Hospitalization", claimsMetrics.ltNationalHospitalization],
    ["LT State National Avg. for Hospitalization", claimsMetrics.ltStateHospitalization],
    ["ED Visit", claimsMetrics.ltEdVisit],
    ["LT ED Visits National Avg.", claimsMetrics.ltEdNational],
    ["LT ED Visits State Avg.", claimsMetrics.ltEdState]
  ];
}

function renderPreview() {
  const rows = getReportRows();
  previewList.innerHTML = "";

  if (!rows.length) {
    previewList.innerHTML = "<div><dt>No facility loaded</dt><dd>--</dd></div>";
    return;
  }

  rows.slice(0, 14).forEach(([label, value]) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = clean(value) || "--";
    wrapper.append(term, description);
    previewList.append(wrapper);
  });
}

function downloadPdf() {
  if (!activeFacility) {
    setStatus("Search for a valid facility before downloading the PDF.", true);
    return;
  }

  const pdf = buildPdf();
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${activeFacility.ccn}-facility-assessment-snapshot.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildPdf() {
  const rows = getReportRows();
  const state = activeFacility.state || "--";
  const medicareUrl = `https://www.medicare.gov/care-compare/details/nursing-home/${activeFacility.ccn}`;
  const content = [];

  drawRect(content, 42, 704, 528, 58, "0.09 0.23 0.34");
  drawText(content, "INFINITE - Managed by MEDELITE", 58, 744, 9, "F2", "1 1 1");
  drawText(content, "FACILITY ASSESSMENT SNAPSHOT", 58, 718, 20, "F2", "1 1 1");
  drawRect(content, 514, 718, 34, 30, "0.09 0.23 0.34", "0.75 0.84 0.9");
  drawText(content, state, 523, 728, 14, "F2", "1 1 1");

  drawText(content, "Facility Summary", 54, 678, 12, "F2", "0.09 0.23 0.34");
  drawLine(content, 54, 668, 558, 668, "0.78 0.82 0.86");

  let y = 650;
  rows.forEach(([label, value], index) => {
    const valueLines = wrapText(clean(value) || "--", 38, 2);
    const labelLines = wrapText(label, 32, 2);
    const rowHeight = Math.max(19, 12 + Math.max(valueLines.length, labelLines.length) * 10);

    if (index % 2 === 0) {
      drawRect(content, 54, y - rowHeight + 7, 504, rowHeight, "0.95 0.97 0.98");
    }

    labelLines.forEach((line, lineIndex) => {
      drawText(content, line, 66, y - lineIndex * 10, 8.2, "F2", "0.24 0.31 0.39");
    });
    valueLines.forEach((line, lineIndex) => {
      drawText(content, line, 306, y - lineIndex * 10, 8.2, "F1", "0.05 0.06 0.08");
    });

    y -= rowHeight;
  });

  y -= 6;
  drawLine(content, 54, y + 8, 558, y + 8, "0.78 0.82 0.86");
  drawText(content, "Medicare Care Compare source:", 54, y - 6, 7.5, "F2", "0.24 0.31 0.39");
  drawText(content, medicareUrl, 180, y - 6, 7.5, "F1", "0 0.32 0.67");

  const stream = content.join("\n");
  const linkRect = [180, y - 8, 520, y + 4].join(" ");

  return createPdfDocument(stream, medicareUrl, linkRect);
}

function drawText(content, text, x, y, size, font = "F1", color = "0 0 0") {
  content.push(`${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET`);
}

function drawRect(content, x, y, width, height, fillColor, strokeColor) {
  if (strokeColor) {
    content.push(`q ${fillColor} rg ${strokeColor} RG ${x} ${y} ${width} ${height} re B Q`);
  } else {
    content.push(`q ${fillColor} rg ${x} ${y} ${width} ${height} re f Q`);
  }
}

function drawLine(content, x1, y1, x2, y2, color) {
  content.push(`q ${color} RG ${x1} ${y1} m ${x2} ${y2} l S Q`);
}

function createPdfDocument(stream, medicareUrl, linkRect) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /ProcSet [/PDF /Text] /Font << /F1 4 0 R /F2 5 0 R >> >> /Annots [7 0 R] /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    `<< /Type /Annot /Subtype /Link /Rect [${linkRect}] /Border [0 0 0] /A << /S /URI /URI (${pdfText(medicareUrl)}) >> >>`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function clearLoadedFacility() {
  activeFacility = null;
  fields.facilityName.value = "";
  fields.location.value = "";
  fields.certifiedBeds.value = "";
  fields.avgResidents.value = "";
  stateBadge.textContent = "--";
  downloadButton.disabled = true;
  renderPreview();
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function clean(value) {
  return String(value ?? "").trim();
}

function wrapText(value, maxChars, maxLines) {
  const words = clean(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
    } else {
      if (line) {
        lines.push(line);
      }
      line = word;
    }
  });

  if (line) {
    lines.push(line);
  }

  if (!lines.length) {
    return ["--"];
  }

  if (lines.length > maxLines) {
    const trimmed = lines.slice(0, maxLines);
    trimmed[maxLines - 1] = `${trimmed[maxLines - 1].slice(0, Math.max(0, maxChars - 3))}...`;
    return trimmed;
  }

  return lines;
}

function pdfText(value) {
  return clean(value)
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
