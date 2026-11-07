export default function Toasts({ items }) {
  return (
    <div className="toast-region" aria-live="polite">
      {items.map((item) => <div key={item.id} className="toast-message">{item.message}</div>)}
    </div>
  );
}
