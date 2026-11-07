### Analyst Dashboard

## Context
Admin dashboard for an NGO tracking conflicts and compiling risk assessments. The dashboard is the analysts' surface for onboarding humanitarian experts against a Risk Code, reviewing the LLM-drafted survey, chasing responses, and triaging unstructured intel experts submit between reports.
The experience needs to be frictionless, privacy-preserving and customisable.

The users of this dashboard are workers of the NGO who will review experts, help enrol them and manage feedback/new information that experts submit. The dashboard is internal-only. Anonymity is a property of what experts reveal to the public or to each other — analysts see everything an expert provides. The dashboard must therefore tag records by contributor Long-termt write time so downstream systems can differentiate, but there is no analyst-side redaction in V1.


### Users
NGO analyst — the only dashboard role in V1. Selects a Risk Code at login (no per-analyst restriction to a single code). No super-admin view, no audit logging.

### Contributor Types (system-wide, set at registration)
Type | Who | Identity | Screening | V1 path
- A: Long-term expert | Vetted specialists | Name or pseudonym (optional) | Full screening form | Analyst-onboarded 
- B: Casual contributor | People met at outreach events | Fully anonymous; opaque handle | Short screening form | Self-onboarded, analyst-approved

Records from A and B carry a contributor_type discriminator so the database and downstream services can separate them. Informal records must not be exposed publicly or linked across communities; internal analyst linking is permitted.

# V1 Scope (must ship)

1. Login / Risk Code selector

Mock auth. Analyst picks a Risk Code (R-[4-digit]) on entry; dashboard scopes all views to it. Analysts can switch codes.

2. Expert status board

List of experts for the selected Risk Code.

    Columns: handle/alias (nullable), type (A/B), invite code issued, whether the invite code was used to onboard, onboarding status (Invited → Onboarded → Awaiting response → Responded), last activity.

    Filters: type, status.

    Deliberately excluded: response contents, submission linkage counts, anything that would create a stable cross-survey trace for Informal beyond the opaque handle.

3. Onboard long-term expert

Analyst-driven form:

    Optional name / pseudonym.

    Assign Risk Code.

    Screening questions (mock standard set): educational background, partner organisations, political affiliation, connection to the studied risk.

    On submit: dashboard generates a unique invite code and displays it for the analyst to copy-paste and share manually. No automated send in V1.

4. Bulk CSV import

Upload CSV of Long-term experts grouped by Risk Code. Required columns: risk code (R-####), optional name/pseudonym, screening fields. Each row gets a generated invite code; result screen shows imported vs. errored rows.
5. Pending approvals (Informal)

Informal users self-onboard via the expert-facing channel either by entering an event-issued identifier or by generating a new identifier after answering a short screening questionnaire. New Informal onboardees appear here as a list for analyst approve / reject. Approved experts become visible on the status board.
6. Survey review

For the selected Risk Code, show the daily job's LLM-drafted questions:

    5 Likert (1–5) + 5 binary (yes/no).

    Analyst can reword, remove, and add questions.

    Publish action sends the survey to experts. Nothing goes out automatically.

    Source risk assessment summary visible alongside for context.

7. Mass notification

Manual trigger: analyst composes a short notification and fires it to a subset of experts on the Risk Code (they can select, Long-term or Informal experts using a button). Used when a risk score rises. Delivery is mocked in V1 (log/queue).


8. Feedback inbox

Inbox of unstructured submissions (POST from expert channels).

- Row actions: tag, link to Risk Code, mark reviewed, reply to expert.

-  Reply is free-text notes; dashboard composes them into an outbound email (mock send).

- Filter by reviewed/unreviewed and linked risk code.

Out of scope for V1

- Expert-facing article matching / inline commenting — the dashboard would only ever receive article link + comment later; deferred entirely.
- Real authentication, RBAC, super-admin views.
- Audit logging (deliberately omitted; noted as a security/privacy trade-off).
- Risk Code CRUD (managed manually by APACS staff outside this system).
- Real email/push delivery, real LLM call, real ACAPS fetch — mock or stub for the demo.
- Analytics/coverage reporting, export back into the risk-report workflow.

## Data model (V1)
Expert
  id, contributor_type ('A'|'B'), risk_code
  display_name        nullable (Long-term only)
  invite_code         generated; shown to analyst for manual share
  invite_used         bool  (surfaced on status board)
  onboarding_status   'invited'|'pending_approval'|'onboarded'|'rejected'
  screening_answers   json  (full set for A, short set for B)
  created_at, updated_at

Survey
  id, risk_code, questions[] ( {id, kind:'likert'|'binary', text, order} )
  status 'draft'|'published', source_assessment_summary, published_at

Submission   (unstructured)
  id, expert_ref (opaque), risk_code nullable, body
  tags[], status 'unreviewed'|'reviewed', reply_notes, replied_at, created_at

Notification
  id, risk_code, body, sent_at, recipient_count

# VIEWS FOR THE DASHBOARD 

## Homepage
- Most important aspect of homepage is the review of the latest survey for the users. Prominent button to lead to the survey review. 
- Switching between risk codes should be a drop-down menu of Country -> Risk codes per country (with preview of title; the risk-radar-export.csv file contains risk codes and titles which can be used as sample)
- The prioritised views on the homepage should be pressing tasks which are: 
    - Reviewing new "unstructured" tips (do not call it feedback but tips/information)
    - Whether there is a new report and survey to be sent out
- The experts panel does not need to appear in the homepage

# Dashboard API (to be formalised as OpenAPI)
POST /auth/select-risk-code — mock session scoping

GET /risk-codes/:code/experts — status board

POST /risk-codes/:code/experts — onboard Long-term (returns generated invite_code)

POST /risk-codes/:code/experts/import — CSV bulk import

GET /pending-approvals · POST /pending-approvals/:id/approve|reject — Informal

GET /risk-codes/:code/survey · PUT /risk-codes/:code/survey — review/edit

POST /risk-codes/:code/survey/publish

POST /risk-codes/:code/notifications — mass notification

GET /submissions · PATCH /submissions/:id (tags/status/risk link) · POST /submissions/:id/reply