import { useState } from "react";
import { ModalHeader } from "../components/Modal.jsx";
import { copyText } from "../lib/utils.js";

export default function InviteResult({ name, invite, onClose }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <ModalHeader eyebrow="INVITE READY · LONG-TERM EXPERT" title="Share this invite code" onClose={onClose} />
      <div className="invite-result">
        <p>Copy and share this code with <strong>{name}</strong> manually. No message has been sent.</p>
        <div className="invite-code-row">
          <code className="invite-code">{invite}</code>
          <button className="copy-code" onClick={async () => { await copyText(invite); setCopied(true); }}>{copied ? "Copied" : "Copy code"}</button>
        </div>
      </div>
      <div className="modal-foot"><button className="btn primary-action" onClick={onClose}>Done</button></div>
    </>
  );
}
