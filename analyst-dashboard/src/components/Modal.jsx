import { useEffect } from "react";

export default function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">{children}</section>
    </div>
  );
}

export function ModalHeader({ eyebrow, title, onClose }) {
  return (
    <div className="modal-header">
      <div><p className="eyebrow">{eyebrow}</p><h2 id="modal-title">{title}</h2></div>
      <button className="modal-close" onClick={onClose} aria-label="Close dialog">×</button>
    </div>
  );
}
