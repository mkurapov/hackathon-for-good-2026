import { useRef, useState } from "react";
import { ModalHeader } from "../components/Modal.jsx";
import { riskCatalogue } from "../data/mock.js";
import { displayRiskCode, parseCSVLine } from "../lib/utils.js";
import { newLongTermExpert } from "./newExpert.js";

const REQUIRED = ["educational_background", "partner_organisations", "political_affiliation", "connection_to_risk"];

function importRows(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = parseCSVLine(lines.shift() || "").map((v) => v.toLowerCase());
  const riskIndex = header.indexOf("risk_code");
  const nameIndex = header.indexOf("name");
  const missing = [...(riskIndex < 0 ? ["risk_code"] : []), ...REQUIRED.filter((f) => !header.includes(f))];
  if (missing.length) return { experts: [], errors: [`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`] };

  const experts = [];
  const errors = [];
  lines.forEach((line, index) => {
    const values = parseCSVLine(line);
    const code = displayRiskCode(values[riskIndex] || "");
    if (!riskCatalogue.some((r) => r.code === code)) { errors.push(`Row ${index + 2}: unknown or invalid Risk Code`); return; }
    const screening = Object.fromEntries(REQUIRED.map((f) => [f, values[header.indexOf(f)] || ""]));
    experts.push(newLongTermExpert({ name: nameIndex >= 0 ? values[nameIndex] : "", riskCode: code, screening, suffix: `-${index + 1}` }));
  });
  return { experts, errors };
}

export default function ImportCsv({ addExperts, onClose }) {
  const fileInput = useRef(null);
  const [dragover, setDragover] = useState(false);
  const [result, setResult] = useState(null);

  const process = async (file) => {
    const { experts, errors } = importRows(await file.text());
    if (experts.length) addExperts(experts);
    setResult({ imported: experts.length, errors });
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
