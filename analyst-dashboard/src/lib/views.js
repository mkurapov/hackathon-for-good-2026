export const VIEWS = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "experts", label: "Expert panel", icon: "◎" },
  { id: "survey", label: "New survey", icon: "▤", title: "Survey review" },
  { id: "feedback", label: "Tips inbox", icon: "▧" },
  { id: "notifications", label: "Send mass notification", icon: "↗" },
];

// Each view lives at its own path ("/" is the overview), so a refresh keeps the screen.
export function pathForView(id) {
  return id === "overview" ? "/" : `/${id}`;
}

export function viewFromPath(pathname = window.location.pathname) {
  const id = pathname.replace(/^\/+|\/+$/g, "");
  return VIEWS.some((item) => item.id === id) ? id : "overview";
}
