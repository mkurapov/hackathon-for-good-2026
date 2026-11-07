import { ModalHeader } from "../components/Modal.jsx";
import { statusClass, timeAgo } from "../lib/utils.js";

const SCREENING_LABELS = {
  education: "Educational background",
  partners: "Partner organisations",
  politics: "Political affiliation",
  connection: "Connection to the studied risk",
};

export default function ExpertProfile({ expertId, experts, risks, onClose }) {
  const expert = experts.find((item) => item.id === expertId);
  if (!expert) return null;
  const linkedRisks = expert.riskCodes.map((code) => risks.find((r) => r.code === code) || { code, title: "" });
  const screening = Object.entries(expert.screening || {}).filter(([, value]) => value);

  return (
    <>
      <ModalHeader eyebrow={`${expert.type === "B" ? "INFORMAL EXPERT" : "LONG-TERM EXPERT"} · PROFILE`} title={expert.internalAlias} onClose={onClose} />
      <div className="profile-identifiers">
        <div><span>Internal alias</span><strong>{expert.internalAlias}</strong></div>
        <div><span>Cross-community identifier</span><strong>{expert.crossCommunityIdentifier}</strong></div>
      </div>
      {expert.expertise.length > 0 && (
        <div className="profile-section">
          <h3>Areas of expertise</h3>
          <div className="profile-tags">{expert.expertise.map((area) => <span key={area} className="profile-tag">{area}</span>)}</div>
        </div>
      )}
      {screening.length > 0 && (
        <div className="profile-section">
          <h3>Screening</h3>
          <dl className="profile-screening">
            {screening.map(([key, value]) => (
              <div key={key}><dt>{SCREENING_LABELS[key] || key.replaceAll("_", " ")}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </div>
      )}
      <div className="profile-section">
        <h3>Risk Codes</h3>
        <div className="profile-risks">
          {linkedRisks.map((r) => <span key={r.code} className="profile-risk"><strong>{r.code}</strong><small>{r.title}</small></span>)}
        </div>
      </div>
      <div className="profile-footer">
        <span className={`status-badge ${statusClass[expert.status] || ""}`}>{expert.status}</span>
        <span>Last activity · {timeAgo(expert.lastActivity, { withTime: true })}</span>
      </div>
    </>
  );
}
