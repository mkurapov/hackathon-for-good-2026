import { useState } from "react";
import { ModalHeader } from "../components/Modal.jsx";
import { api } from "../lib/api.js";
import { EXPERTISE_AREAS } from "../lib/utils.js";

const SCREENING = ["education", "partners", "politics", "connection"];

export default function AddExpert({ riskCode, risks, reloadExperts, openModal, attempt, onClose }) {
  const [expertise, setExpertise] = useState([]);
  const [sending, setSending] = useState(false);

  const toggleArea = (area) =>
    setExpertise((items) => (items.includes(area) ? items.filter((item) => item !== area) : [...items, area]));

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const name = String(data.get("name") || "").trim();
    const code = String(data.get("riskCode"));
    setSending(true);
    const invite = await attempt(() =>
      api.addExpert(code, {
        name,
        expertise,
        screening: Object.fromEntries(SCREENING.map((key) => [key, String(data.get(key) || "").trim()])),
      })
    );
    setSending(false);
    if (!invite) return;
    if (code === riskCode) reloadExperts();
    openModal("invite", { name: name || "the expert", invite: invite.invite_code });
  };

  return (
    <>
      <ModalHeader eyebrow="LONG-TERM EXPERT · ANALYST ONBOARDING" title="Add an expert" onClose={onClose} />
      <form onSubmit={submit}>
        <div className="modal-form-grid">
          <div className="modal-field full">
            <label htmlFor="expert-display-name">Name or pseudonym <span className="muted">(optional)</span></label>
            <input id="expert-display-name" name="name" type="text" placeholder="Leave blank to use an opaque handle" maxLength={80} autoFocus />
          </div>
          <div className="modal-field full">
            <label htmlFor="expert-risk-code">Risk Code</label>
            <select id="expert-risk-code" name="riskCode" defaultValue={riskCode}>
              {risks.map((r) => <option key={r.code} value={r.code}>{r.code} · {r.title}</option>)}
            </select>
          </div>
          <div className="modal-field full">
            <label>Areas of expertise</label>
            <div className="profile-tags" role="group" aria-label="Areas of expertise">
              {EXPERTISE_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  className={`filter-pill${expertise.includes(area) ? " selected" : ""}`}
                  aria-pressed={expertise.includes(area)}
                  onClick={() => toggleArea(area)}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-field full">
            <label htmlFor="expert-education">Educational background</label>
            <textarea id="expert-education" name="education" placeholder="Education, training, or relevant experience" />
          </div>
          <div className="modal-field">
            <label htmlFor="expert-partners">Partner organisations</label>
            <input id="expert-partners" name="partners" type="text" placeholder="Organisation names" />
          </div>
          <div className="modal-field">
            <label htmlFor="expert-politics">Political affiliation</label>
            <input id="expert-politics" name="politics" type="text" placeholder="As disclosed by expert" />
          </div>
          <div className="modal-field full">
            <label htmlFor="expert-connection">Connection to the studied risk</label>
            <textarea id="expert-connection" name="connection" placeholder="Relevant local knowledge or professional connection" />
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary-action" disabled={sending}>
            {sending ? "Generating…" : "Generate invite code"}
          </button>
        </div>
      </form>
    </>
  );
}
