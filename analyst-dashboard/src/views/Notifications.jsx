import { useState } from "react";
import { nowLabel } from "../lib/utils.js";

const RECIPIENTS = [
  { value: "all", label: "All experts" },
  { value: "A", label: "Long-term experts" },
  { value: "B", label: "Informal experts" },
];

export default function Notifications({ risk, currentExperts, notifications, onQueue, toast }) {
  const [recipientType, setRecipientType] = useState("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const countFor = (type) => currentExperts.filter((e) => type === "all" || e.type === type).length;
  const deteriorating = risk.trend.toLowerCase().includes("deteriorat");

  const submit = (event) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    const count = countFor(recipientType);
    onQueue({ id: Date.now(), subject: subject.trim(), message: message.trim(), count, type: recipientType, date: nowLabel() });
    setSubject("");
    setMessage("");
    toast(`Notification queued for ${count} experts`);
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div><p className="eyebrow">ACTIVE RISK {risk.code}</p><h1>Send mass notification</h1></div>
      </div>
      <div className="notification-layout">
        <form className="notification-form panel-block" onSubmit={submit}>
          <div className="block-heading">
            <div><p className="eyebrow">NEW MESSAGE</p><h2>Compose notification</h2></div>
            <span className="mock-label">MOCK DELIVERY</span>
          </div>
          <label className="form-label">Recipients</label>
          <div className="recipient-options" role="group" aria-label="Select recipients">
            {RECIPIENTS.map((r) => (
              <button key={r.value} type="button" className={`recipient-choice${recipientType === r.value ? " selected" : ""}`} onClick={() => setRecipientType(r.value)}>
                <span className="recipient-check">{recipientType === r.value ? "✓" : ""}</span>
                <span><strong>{r.label}</strong><small>{countFor(r.value)} recipients</small></span>
              </button>
            ))}
          </div>
          <label className="form-label" htmlFor="notification-subject">Subject</label>
          <input id="notification-subject" className="form-input" type="text" placeholder="A short, clear subject" maxLength={100} required value={subject} onChange={(e) => setSubject(e.target.value)} />
          <label className="form-label" htmlFor="notification-message">Message</label>
          <textarea id="notification-message" className="form-input notification-textarea" placeholder="Share a concise update with the selected experts..." maxLength={500} required value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="message-foot"><span>Delivery is mocked and logged in this prototype.</span><span>{message.length} / 500</span></div>
          <button className="btn primary-action send-button" type="submit"><span className="button-icon">↗</span> Queue notification</button>
        </form>
        <aside className="notification-aside">
          <div className="risk-alert">
            <span className="risk-alert-icon">↑</span>
            <div>
              <span className="priority-kicker">{deteriorating ? "RISK TREND DETERIORATED" : "CURRENT RISK PROFILE"}</span>
              <h2>{risk.title}</h2>
              <p><strong>Risk level {risk.level}</strong><span>Trend: {risk.trend}</span></p>
            </div>
          </div>
          <div className="delivery-note">
            <span className="delivery-icon">↗</span>
            <h2>Manual by design</h2>
            <p>Send a timely update to selected experts when an issue escalates. Delivery is simulated in this prototype.</p>
          </div>
          <div className="history-block">
            <div className="block-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Queued notifications</h2></div></div>
            <div className="notification-history">
              {notifications.length === 0 && <div className="history-empty">No notifications queued yet.</div>}
              {notifications.slice(0, 5).map((item) => (
                <div key={item.id} className="history-item">
                  <strong>{item.subject}</strong>
                  <small>{item.date} · {item.count} recipients ({RECIPIENTS.find((r) => r.value === item.type).label})</small>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
