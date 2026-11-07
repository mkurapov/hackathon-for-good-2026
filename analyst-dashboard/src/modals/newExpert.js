import { expertiseSamples } from "../data/mock.js";
import { makeInviteCode } from "../lib/utils.js";

export function newLongTermExpert({ name, riskCode, screening, suffix = "" }) {
  const stamp = String(Date.now()).slice(-4);
  const displayName = name?.trim() || `Expert ${stamp}${suffix}`;
  return {
    id: `e-${Date.now()}${suffix}`,
    type: "A",
    name: displayName,
    internalAlias: displayName,
    crossCommunityIdentifier: `LT-${stamp}`,
    expertise: expertiseSamples.slice(0, 2),
    riskCode,
    riskCodes: [riskCode],
    invite: makeInviteCode(),
    used: false,
    status: "Invited",
    activity: "Just now",
    screening,
  };
}
