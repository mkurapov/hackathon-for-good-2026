export const statusClass = {
  Invited: "status-invited",
  Onboarded: "status-onboarded",
  "Awaiting response": "status-awaiting",
  Responded: "status-responded",
};

export const initialsFor = (name) =>
  name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

export const displayRiskCode = (value) => value.toUpperCase().replace(/^R-?(\d{4})$/, "R-$1");

export const typeLabel = (type) => (type === "B" ? "Informal" : "Long-term");

export function makeInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `AC-${segment()}-${segment().slice(0, 2)}`;
}

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

export const nowLabel = () =>
  new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
