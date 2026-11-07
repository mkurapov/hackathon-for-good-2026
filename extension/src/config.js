// Where the Ground Truth API runs. Also add its host to "host_permissions" in manifest.json,
// and the host of its /join page to the invite content script's "matches".
export const API_BASE = 'http://localhost:8000';

// Experts are invited by ACAPS, which already has their details. They can change this in Settings.
export const DEFAULT_ANONYMITY = 'known_to_acaps';

// Code shown in the activation box when the expert has not opened an invite link. Set to '' for
// a real release; it is the demo code from backend/seed_demo.py.
export const PREFILL_INVITE_CODE = 'DEMO1';

// How often the background refreshes the expert's profile and survey.
export const REFRESH_MINUTES = 60;

// How often the background checks for a newly published survey, so the toolbar badge appears
// soon after an analyst publishes one. 3 seconds is for the demo; use a minute or more for a release.
export const SURVEY_CHECK_SECONDS = 3;
