import { useRef, useState } from "react";
import { ModalHeader } from "../components/Modal.jsx";
import { api } from "../lib/api.js";
import { parseCSVLine } from "../lib/utils.js";

const REQUIRED = ["educational_background", "partner_organisations", "political_affiliation", "connection_to_risk"];

// Parses the CSV into API rows. Risk Codes are validated by the backend.
function parseRows(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = parseCSVLine(lines.shift() || "").map((v) => v.toLowerCase());
  const riskIndex = header.indexOf("risk_code");
  const nameIndex = header.indexOf("name");
  const missing = [...(riskIndex < 0 ? ["risk_code"] : []), ...REQUIRED.filter((f) => !header.includes(f))];
  if (missing.length) return { error: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}` };

  return {
    rows: lines.map((line) => {
      const values = parseCSVLine(line);
      return {
        risk_id: values[riskIndex] || "",
        display_name: (nameIndex >= 0 ? values[nameIndex] : "") || null,
        screening: Object.fromEntries(REQUIRED.map((f) => [f, values[header.indexOf(f)] || ""])),
      };
    }),
  };
}

export default function ImportCsv({ riskCode, reloadExperts, attempt, onClose }) {
  const fileInput = useRef(null);
  const [dragover, setDragover] = useState(false);
  const [result, setResult] = useState(null);

  const process = async (file) => {
    const { rows, error } = parseRows(await file.text());
    if (error) { setResult({ imported: 0, errors: [error] }); return; }
    if (!rows.length) { setResult({ imported: 0, errors: ["The file has no data rows"] }); return; }
    const response = await attempt(() => api.importExperts(rows));
    if (!response) return;
    // The header is line 1, so data row n is line n + 1.
    setResult({
      imported: response.imported.length,
      errors: response.errors.map((e) => `Row ${e.row + 1}: ${e.detail}`),
    });
    if (response.imported.some((invite) => invite.risk_id === riskCode)) reloadExperts();
  };

  return (
    <>
      <ModalHeader eyebrow="BULK ONBOARDING · LONG-TERM EXPERTS" title="Import experts from CSV" onClose={onClose} />
      <div
        className={`drop-zone${dragover ? " dragover" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => fileInput.current.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInput.current.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={(e) => { e.preventDefault(); setDragover(false); if (e.dataTransfer.files[0]) process(e.dataTransfer.files[0]); }}
      >
        <span className="drop-icon">↑</span>
        <strong>Choose a CSV file or drop it here</strong>
        <small>Each valid row receives a unique invite code.</small>
        <input ref={fileInput} type="file" className="file-input" accept=".csv,text/csv" onChange={(e) => { if (e.target.files[0]) process(e.target.files[0]); }} />
      </div>
      <p className="csv-help">Required headers: risk_code, name, educational_background, partner_organisations, political_affiliation, connection_to_risk. The name column may be blank.</p>
      {result && (
        <div className="import-results">
          <strong>{result.imported} imported · {result.errors.length} row{result.errors.length === 1 ? "" : "s"} with errors</strong>
          {result.errors.length
            ? <ul>{result.errors.map((err) => <li key={err}>{err}</li>)}</ul>
            : <span>Invite codes have been generated for each long-term expert.</span>}
        </div>
      )}
      <div className="modal-foot"><button className="btn secondary" onClick={onClose}>Close</button></div>
    </>
  );
}
