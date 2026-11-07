import { useState } from "react";
import { ModalHeader } from "../components/Modal.jsx";
import { copyText } from "../lib/utils.js";

function CopyRow({ value, label, mono = true }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="invite-code-row">
      <code className={mono ? "invite-code" : "invite-code invite-link"}>{value}</code>
      <button className="copy-code" onClick={async () => { await copyText(value); setCopied(true); }}>{copied ? "Copied" : label}</button>
    </div>
  );
}

export default function InviteResult({ name, invite, telegramLink, onClose }) {
  return (
    <>
      <ModalHeader eyebrow="INVITE READY · LONG-TERM EXPERT" title="Share this invite code" onClose={onClose} />
      <div className="invite-result">
        <p>Copy and share this code with <strong>{name}</strong> manually. No message has been sent.</p>
        <CopyRow value={invite} label="Copy code" />
        {telegramLink && (
          <>
            <p className="invite-telegram-hint">Or send this Telegram link. Opening it signs them in to the ACAPS bot with this code.</p>
            <CopyRow value={telegramLink} label="Copy link" mono={false} />
          </>
        )}
      </div>
      <div className="modal-foot"><button className="btn primary-action" onClick={onClose}>Done</button></div>
    </>
  );
}
