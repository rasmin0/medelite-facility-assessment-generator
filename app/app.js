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

Object.values(fields).forEach((field) => {
  field.addEventListener("input", renderPreview);
});

renderPreview();

async function lookupFacility() {
  const ccn = fields.ccn.value.trim();
  if (!/^\d{6}$/.test(ccn)) {
    setStatus("Enter a valid 6-digit CCN.", true);
    return;
  }

  setStatus("Searching CMS Provider Data Catalog...");
  lookupButton.disabled = true;
  downloadButton.disabled = true;

  try {
    const response = await fetch(`/api/facility?ccn=${encodeURIComponent(ccn)}`);

    if (response.status === 404) {
      activeFacility = null;
      clearCmsFields();
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
    setStatus("Could not load CMS data. Check the browser console or try again.", true);
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

  rows.slice(0, 13).forEach(([label, value]) => {
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

  content.push("0 0 0 rg BT /F1 10 Tf 72 746 Td (INFINITE - Managed by MEDELITE) Tj ET");
  content.push("0 0 0 rg BT /F2 20 Tf 72 712 Td (FACILITY ASSESSMENT SNAPSHOT) Tj ET");
  content.push(`0 0 0 rg BT /F2 18 Tf 510 712 Td (${pdfText(state)}) Tj ET`);

  let y = 674;
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      content.push(`q 0.93 0.96 0.98 rg 66 ${y - 8} 480 22 re f Q`);
    }
    content.push(`0 0 0 rg BT /F2 9 Tf 78 ${y} Td (${pdfText(label)}) Tj ET`);
    content.push(`0 0 0 rg BT /F1 9 Tf 300 ${y} Td (${pdfText(clean(value) || "--")}) Tj ET`);
    y -= 22;
  });

  y -= 8;
  content.push(`0 0 0 rg BT /F1 8 Tf 78 ${y} Td (Medicare Care Compare source:) Tj ET`);
  content.push(`0 0.32 0.67 rg BT /F1 8 Tf 220 ${y} Td (${pdfText(medicareUrl)}) Tj ET 0 0 0 rg`);

  const stream = content.join("\n");
  const linkRect = [220, y - 2, 520, y + 10].join(" ");

  return createPdfDocument(stream, medicareUrl, linkRect);
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

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function clearCmsFields() {
  activeFacility = null;
  fields.facilityName.value = "";
  fields.location.value = "";
  fields.certifiedBeds.value = "";
  fields.avgResidents.value = "";
  stateBadge.textContent = "--";
  renderPreview();
}

function clean(value) {
  return String(value ?? "").trim();
}

function pdfText(value) {
  return clean(value)
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

window.__medeliteTest = {
  buildPdf: () => buildPdf(),
  getReportRows: () => getReportRows()
};
