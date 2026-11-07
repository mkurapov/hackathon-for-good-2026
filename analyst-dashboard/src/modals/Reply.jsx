import { useState } from "react";
import { ModalHeader } from "../components/Modal.jsx";

export default function Reply({ submissionId, submissions, replyTip, toast, onClose }) {
  const [sending, setSending] = useState(false);
  const submission = submissions.find((item) => item.id === submissionId);
  if (!submission) return null;

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    const tip = await replyTip(submission.id, String(new FormData(event.target).get("notes")));
    setSending(false);
    if (!tip) return;
    onClose();
    toast(`Reply composed for ${submission.handle} (mock send)`);
  };

  return (
    <>
      <ModalHeader eyebrow="TIP RESPONSE · MOCK EMAIL" title="Reply to contributor" onClose={onClose} />
      <div className="reply-context"><strong>To: {submission.handle}</strong>{submission.body}</div>
      <form onSubmit={submit}>
        <div className="modal-field">
          <label htmlFor="reply-notes">Reply notes</label>
          <textarea id="reply-notes" name="notes" required placeholder="Write a short response for the expert..." defaultValue={submission.reply || ""} autoFocus />
        </div>
        <div className="modal-foot">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary-action" disabled={sending}>{sending ? "Sending…" : "Compose and send"}</button>
        </div>
      </form>
    </>
  );
}
