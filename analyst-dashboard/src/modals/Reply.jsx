import { ModalHeader } from "../components/Modal.jsx";

export default function Reply({ submissionId, submissions, updateSubmission, toast, onClose }) {
  const submission = submissions.find((item) => item.id === submissionId);
  if (!submission) return null;

  const submit = (event) => {
    event.preventDefault();
    updateSubmission(submission.id, { reply: new FormData(event.target).get("notes"), status: "reviewed" });
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
          <textarea id="reply-notes" name="notes" required placeholder="Write a short response for the expert..." autoFocus />
        </div>
        <div className="modal-foot">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary-action">Compose and send</button>
        </div>
      </form>
    </>
  );
}
