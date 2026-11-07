import { ModalHeader } from "../components/Modal.jsx";
import { riskCatalogue } from "../data/mock.js";
import { statusClass } from "../lib/utils.js";

export default function ExpertProfile({ expertId, experts, onClose }) {
  const expert = experts.find((item) => item.id === expertId);
  if (!expert) return null;
  const linkedRisks = expert.riskCodes.map((code) => riskCatalogue.find((r) => r.code === code)).filter(Boolean);

  return (
    <>
      <ModalHeader eyebrow={`${expert.type === "B" ? "INFORMAL EXPERT" : "LONG-TERM EXPERT"} · PROFILE`} title={expert.internalAlias} onClose={onClose} />
      <div className="profile-identifiers">
        <div><span>Internal alias</span><strong>{expert.internalAlias}</strong></div>
        <div><span>Cross-community identifier</span><strong>{expert.crossCommunityIdentifier}</strong></div>
      </div>
      <div className="profile-section">
        <h3>Areas of expertise</h3>
        <div className="profile-tags">{expert.expertise.map((area) => <span key={area} className="profile-tag">{area}</span>)}</div>
      </div>
      <div className="profile-section">
        <h3>Risk Codes</h3>
        <div className="profile-risks">
          {linkedRisks.map((r) => <span key={r.code} className="profile-risk"><strong>{r.code}</strong><small>{r.title}</small></span>)}
        </div>
      </div>
      <div className="profile-footer">
        <span className={`status-badge ${statusClass[expert.status] || ""}`}>{expert.status}</span>
        <span>Last activity · {expert.activity}</span>
      </div>
    </>
  );
}
