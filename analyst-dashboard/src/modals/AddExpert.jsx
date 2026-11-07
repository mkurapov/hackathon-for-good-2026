import { ModalHeader } from "../components/Modal.jsx";
import { riskCatalogue } from "../data/mock.js";
import { newLongTermExpert } from "./newExpert.js";

const SCREENING = ["education", "partners", "politics", "connection"];

export default function AddExpert({ riskCode, addExperts, openModal, onClose }) {
  const submit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const expert = newLongTermExpert({
      name: String(data.get("name") || ""),
      riskCode: String(data.get("riskCode")),
      screening: Object.fromEntries(SCREENING.map((key) => [key, String(data.get(key) || "")])),
    });
    addExperts([expert]);
    openModal("invite", { name: expert.name, invite: expert.invite });
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
              {riskCatalogue.map((r) => <option key={r.code} value={r.code}>{r.code} · {r.title}</option>)}
            </select>
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
          <button type="submit" className="btn primary-action">Generate invite code</button>
        </div>
      </form>
    </>
  );
}
