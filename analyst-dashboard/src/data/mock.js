// Mock data for the demo. The risk catalogue stands in for risk-radar-export.csv
// until the dashboard is wired to the backend.

export const expertiseSamples = ["Economy", "Displacement", "Humanitarian Aid", "Women's Rights", "Conflict"];

export const riskCatalogue = [
  {
    code: "R-1062",
    title: "Escalating armed clashes disrupt access and supply routes",
    countries: ["Sudan"],
    level: "High",
    trend: "Deteriorating",
    basedOnUpdate: "06/11/2026",
    summary: "Clashes around key transport corridors have intensified over the past month, cutting supply routes to several districts. Health facilities report shortages of trauma kits and essential medicines, and new displacement towards host communities is likely if fighting continues.",
  },
  {
    code: "R-1015",
    title: "Checkpoint closures drive food price increases",
    countries: ["Sudan", "South Sudan"],
    level: "Medium",
    trend: "Stable",
    basedOnUpdate: "28/10/2026",
    summary: "Closure of northern checkpoints restricts trade flows. Traders expect food prices to rise through the end of the month, with poorer households most exposed.",
  },
  {
    code: "R-1020",
    title: "Flooding season increases displacement pressure",
    countries: ["South Sudan"],
    level: "Medium",
    trend: "Deteriorating",
    basedOnUpdate: "02/11/2026",
    summary: "Above-average rainfall forecasts raise the risk of riverine flooding in already displaced communities, straining shelter and WASH capacity.",
  },
  {
    code: "R-9001",
    title: "Venezuela: instability after the political transition",
    countries: ["Venezuela"],
    level: "High",
    trend: "Deteriorating",
    basedOnUpdate: "01/11/2026",
    summary: "Tensions between security forces and the new cabinet, pressure on released opposition figures, and fragile rural food supply chains point to a risk of localised service collapse in the next quarter.",
  },
];

const baseExperts = [
  { id: "e-01", type: "A", name: "Dr. Leila Haddad", invite: "AC-7F2K-91", used: true, status: "Responded", activity: "Today, 09:42", riskCode: "R-1062" },
  { id: "e-02", type: "A", name: "M. Okafor", invite: "AC-3M8Q-14", used: true, status: "Awaiting response", activity: "Yesterday", riskCode: "R-1062" },
  { id: "e-03", type: "B", name: "Field contributor 08", invite: "AC-9P1D-62", used: true, status: "Onboarded", activity: "2 days ago", riskCode: "R-1062" },
  { id: "e-04", type: "A", name: "Samira N.", invite: "AC-5J6R-33", used: false, status: "Invited", activity: "3 days ago", riskCode: "R-1062" },
  { id: "e-05", type: "B", name: "Field contributor 12", invite: "AC-2W4B-08", used: true, status: "Awaiting response", activity: "4 days ago", riskCode: "R-1062" },
  { id: "e-06", type: "A", name: "R. Mensah", invite: "AC-8L2C-75", used: true, status: "Responded", activity: "5 days ago", riskCode: "R-1062" },
  { id: "e-07", type: "A", name: "Nadia K.", invite: "AC-4H7N-20", used: false, status: "Invited", activity: "1 week ago", riskCode: "R-1062" },
  { id: "e-08", type: "B", name: "Field contributor 19", invite: "AC-6D3T-57", used: true, status: "Onboarded", activity: "1 week ago", riskCode: "R-1062" },
  { id: "e-09", type: "A", name: "Dr. Peter Osei", invite: "AC-1N9F-48", used: true, status: "Awaiting response", activity: "2 weeks ago", riskCode: "R-1015" },
  { id: "e-10", type: "B", name: "Field contributor 03", invite: "AC-7A5E-11", used: false, status: "Invited", activity: "2 weeks ago", riskCode: "R-1015" },
  { id: "e-11", type: "A", name: "T. Mwangi", invite: "AC-9C2K-86", used: true, status: "Onboarded", activity: "Yesterday", riskCode: "R-1015" },
  { id: "e-12", type: "A", name: "H. Saleh", invite: "AC-6B4M-39", used: false, status: "Invited", activity: "4 days ago", riskCode: "R-1020" },
];

export const initialExperts = baseExperts.map((expert, index) => ({
  ...expert,
  internalAlias: expert.type === "B" ? expert.name.replace("Field contributor", "FC") : expert.name,
  crossCommunityIdentifier: expert.type === "B" ? `opaque-${String(index + 8).padStart(2, "0")}` : `LT-${String(index + 1048).padStart(4, "0")}`,
  expertise: [expertiseSamples[index % expertiseSamples.length], expertiseSamples[(index + 2) % expertiseSamples.length]],
  riskCodes: [expert.riskCode, ...(index === 0 ? ["R-1015"] : index === 4 ? ["R-1020"] : [])],
}));

export const initialQuestions = [
  { kind: "Likert", text: "How likely is it that armed clashes will intensify in the coming four weeks?" },
  { kind: "Likert", text: "How would you rate the current risk of disruption to key transport corridors?" },
  { kind: "Likert", text: "To what extent are local health facilities able to maintain essential services?" },
  { kind: "Likert", text: "How severe is the current pressure on the availability of essential supplies?" },
  { kind: "Likert", text: "How confident are you in the information available about emerging displacement?" },
  { kind: "Binary", text: "Have you observed new population movements in your area in the past seven days?" },
  { kind: "Binary", text: "Are any key roads or transport routes currently inaccessible?" },
  { kind: "Binary", text: "Have health facilities reported a shortage of essential medical supplies?" },
  { kind: "Binary", text: "Has access to humanitarian assistance changed in the past two weeks?" },
  { kind: "Binary", text: "Are local authorities currently responding to the reported access constraints?" },
].map((q, i) => ({ ...q, id: `q-${i + 1}` }));

export const initialSubmissions = [
  { id: "s-01", handle: "Field contributor 19", type: "B", date: "Today, 10:18", body: "The eastern road has been intermittently blocked since Monday. Community members are taking the river route, but transport costs have increased sharply.", tags: ["Access", "Transport"], riskCode: "R-1062", status: "unreviewed" },
  { id: "s-02", handle: "Dr. Leila Haddad", type: "A", date: "Today, 08:52", body: "Two clinics in the central area report that deliveries of trauma kits have not arrived this week. They have enough stock for several days, but no confirmed replenishment date.", tags: ["Health", "Supplies"], riskCode: "R-1062", status: "unreviewed" },
  { id: "s-03", handle: "Field contributor 08", type: "B", date: "Yesterday, 17:26", body: "Families from three nearby villages are staying with relatives near the market. I have not seen a formal site open yet.", tags: ["Displacement"], riskCode: null, status: "unreviewed" },
  { id: "s-04", handle: "M. Okafor", type: "A", date: "Yesterday, 14:03", body: "Local traders expect food prices to rise if the northern checkpoint remains closed through the end of the month.", tags: ["Markets"], riskCode: "R-1015", status: "reviewed" },
];
