import { VIEWS } from "../lib/views.js";

export default function Sidebar({ view, goTo, unreviewedCount, mobileOpen }) {
  return (
    <aside className={`sidebar-nav${mobileOpen ? " mobile-open" : ""}`}>
      <a className="brand" href="/" onClick={(event) => { event.preventDefault(); goTo("overview"); }} aria-label="ACAPS analyst workspace home">
        <span className="brand-name">ACAPS<span>.</span></span>
        <span className="brand-caption">Analyst workspace</span>
      </a>

      <div className="workspace-label">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">
        {VIEWS.map((item) => (
          <button key={item.id} className={`nav-item${view === item.id ? " active" : ""}`} onClick={() => goTo(item.id)}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.id === "feedback" && <span className="nav-count alert">{unreviewedCount}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="privacy-note">
          <span className="privacy-mark">●</span>
          <span>Internal analyst view<br /><small>Contributor privacy protected</small></span>
        </div>
        <div className="analyst-profile">
          <div className="avatar analyst-avatar">AM</div>
          <div><strong>Alex Morgan</strong><small>Field analyst</small></div>
        </div>
      </div>
    </aside>
  );
}
