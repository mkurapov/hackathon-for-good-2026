export const statusClass = {
  Invited: "status-invited",
  Onboarded: "status-onboarded",
  "Awaiting response": "status-awaiting",
  Responded: "status-responded",
};

export const initialsFor = (name) =>
  name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

export const typeLabel = (type) => (type === "B" ? "Informal" : "Long-term");

export function parseCSVLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"' && quoted) { value += '"'; i += 1; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += ch;
  }
  values.push(value.trim());
  return values;
}

export async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}

export const EXPERTISE_AREAS = ["Economy", "Displacement", "Humanitarian Aid", "Women's Rights", "Conflict"];

const timeFormat = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });
const dateTimeFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

// "Today, 09:42", "Yesterday, 17:26", "3 days ago", "2 weeks ago", "4 Oct"
export function timeAgo(value, { withTime = false } = {}) {
  if (!value) return "";
  const date = new Date(value);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  const time = withTime ? `, ${timeFormat.format(date)}` : "";
  if (days <= 0) return `Today${time}`;
  if (days === 1) return `Yesterday${time}`;
  if (days < 7) return `${days} days ago`;
  if (days < 28) return `${Math.floor(days / 7)} week${days < 14 ? "" : "s"} ago`;
  return dayFormat.format(date);
}

export const formatDateTime = (value) => (value ? dateTimeFormat.format(new Date(value)) : "");

// A readable name for an article we only know by URL: its last path segment, else the host.
export function articleLabel(url) {
  try {
    const { hostname, pathname } = new URL(url);
    const slug = decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "").replace(/\.[a-z0-9]+$/i, "");
    const words = slug.replace(/[-_]+/g, " ").trim();
    return words ? words[0].toUpperCase() + words.slice(1) : hostname;
  } catch {
    return url;
  }
}

export const hostnameOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};
