### Analyst Dashboard

## Context
We are creating an admin dashboard for an app which will become (1) a browser extension for Firefox (primary goal) (2) telegram bot (3) Whatsapp bot to help an NGO which tracks conflicts and compiles risk reports/assessments stay in touch with their humanitarian experts between reports and update their info accordingly.

The experience needs to be frictionless, privacy-preserving and customisable.

The users of this dashboard are workers of the NGO who will review experts, help enrol them and manage feedback/new information that experts submit.

## Requirements
1. Admins should be able to register new experts:
    -  there should be no mandatory name fields as an opaque alias can be used, or no alias at all so intelligence from the same person cannot be traced back to them (2 pieces of information from a fully anonymous user should not be linked together in any way)
    - Experts should be linked to a specific conflict which they can comment on (in the form of R-1043, for example; this is called a 'Risk Code')
    - Admins should be able to review status of 