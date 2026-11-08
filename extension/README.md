# ACAPS expert extension (Firefox)

Firefox extension for ACAPS experts: answer short surveys, share what they see on the ground, ask ACAPS to get in touch, and agree, disagree or comment on news articles about the crises they follow. Requirements: [SPEC.md](SPEC.md). API: [backend/openapi.yaml](../backend/openapi.yaml).

Manifest V3, plain JavaScript, no build step.

## Try it locally

1. Start the API in Docker with a demo panel and a published survey (no LLM or ACAPS credentials needed). From the repo root:

   ```bash
   docker compose -f docker/docker-compose.yml up -d --build
   docker compose -f docker/docker-compose.yml exec api python seed_demo.py --publish   # prints the invite code DEMO1
   ```

   Without `--publish` the survey stays a draft and the extension shows no survey until an analyst publishes it from the dashboard (**New survey** → **Publish survey**; see the [main README](../README.md#run-the-demo-locally) for the `ANALYST_API_KEY` the dashboard needs). The database lives in the `groundtruth-data` volume. `docker compose -f docker/docker-compose.yml down -v` wipes it.

2. Load the extension: open `about:debugging#/runtime/this-firefox` in Firefox, click **Load Temporary Add-on…** and pick `extension/manifest.json`. A welcome tab opens.

3. Join: open <http://localhost:8000/join?code=DEMO1>, or type `DEMO1` in the welcome tab. Then click **This is me, continue**.

4. Try an article: open any article on a supported news site (BBC, Al Jazeera, The Conversation, DW or The New York Times), for example <https://www.aljazeera.com/news/longform/2026/2/20/a-fragile-freedom-for-venezuelas-released-political-prisoners>. The toast appears. Select some text to get the Agree / Disagree / Comment bar.

`docker compose -f docker/docker-compose.yml exec api python seed_demo.py --reset` removes the demo experts and their answers, to start over.

## What it does

| Where | What |
|---|---|
| Toolbar popup | Registration when signed out. Otherwise: the waiting survey, a "Share information" box (`POST /notes`), and "Ask ACAPS to contact me" (`POST /contact-requests`). The sidebar button opens the sidebar. |
| Sidebar | The same home view plus a card for the article in the active tab, the survey, article feedback, and Settings (anonymity level, sign out). |
| Survey | One question per screen, Yes / No questions first, then 1–5 forecasts. Each answer saves as a draft (`PUT …/responses`, `status: draft`) and moves on by itself unless a comment was typed. "Don't know" sends `null`. Next always works. The last question needs an explicit Submit. Keyboard: 1–5, Y / N, D, Enter. |
| News article | On the listed news sites, any article counts as a match and is linked to the expert's own risk (the check is in `background.js`). A toast offers one-click Agree / Disagree (sent at once) and links to give more detail or take the survey. Selecting text shows a bar with Agree, Disagree and Comment. The passage is marked on the page and added to the article feedback, which is sent as one `POST /articles/comments` per item (`stance`, `quote`, `text`). |
| Invite link | `GET /join?code=…` on the API. The extension reads the code from that page and opens the welcome tab on the confirm step. |
| Badge | Shows `1` (and a tooltip naming the risk) while a survey is waiting. The background checks for a newly published survey every 3 seconds for the demo (`SURVEY_CHECK_SECONDS`) and refreshes the full profile every 60 minutes. |

New experts register as `known_to_acaps`, since ACAPS invited them and already has their details. They can change this in Settings.

## Layout

```
manifest.json
src/
  config.js            API address and defaults
  background.js        token, all API calls, state, badge (the only code that talks to the API)
  lib/api.js           fetch wrapper
  lib/ui.js, ui.css    shared helpers and styles (ACAPS colours)
  views/               home, survey, feedback, settings, registration: shared by the pages below
  popup/               toolbar popup
  sidebar/             Firefox sidebar
  onboarding/          welcome / registration tab
  content/article.js   runs on news sites: matching, toast, selection bar, marks, in-page panel
  content/invite.js    runs on the /join page
  frames/              toast, selection bar and panel, injected into articles as iframes
dev/article.html       test article used by the e2e test
tests/e2e_firefox.py   end-to-end test in real Firefox (see the file header)
design/                the clickable HTML prototypes the extension is based on
```

Pages talk to the background with `browser.runtime.sendMessage({ type, … })`. The handlers are listed at the bottom of `background.js`. State lives in `storage.local` (token, profile, survey, drafts) and `storage.session` (matched article per tab).

## Things to know

- **Sidebar vs in-page panel.** Firefox only lets an extension open its sidebar from the toolbar button, a menu, a shortcut, or a click on a full extension page. Frames injected into a web page don't qualify. So the toast and selection bar show the feedback or survey view in the sidebar if it is already open, and otherwise in a panel on the right of the page. The toolbar popup opens the real sidebar. Alt+Shift+A also toggles it.
- **Article matching** is a domain allowlist for now: any article on a supported site is linked to the expert's risk. The API's `POST /articles/match` (risk ID or exact title in the text) is not called by the extension yet.
- **News sites** are BBC, Al Jazeera, The Conversation, DW and The New York Times. They are listed twice and must be kept in sync: `content_scripts` in `manifest.json` and `NEWS_SITES` in `src/background.js`. `localhost` is not included. The e2e test installs a patched copy that adds the dev article page (`localhost:8766`).
- **Deploying the API elsewhere**: change `API_BASE` in `src/config.js`, add the API host to `host_permissions`, and add its `/join*` URL to the invite content script's `matches`.
- **Fonts and logo** match acaps.org. Roboto Condensed and Bebas Neue (both open licence) are bundled in `src/lib/fonts`, and the logo in `icons/`, so no third party sees the expert's browsing.
- **Drafts** are kept in the browser and also saved to the API as drafts. The API has no way to read a draft back, so a survey started on another device starts fresh.
- `web-ext lint` reports `innerHTML` warnings. Every dynamic value goes through `esc()` in `lib/ui.js`. Moving the views to DOM building would silence them before publishing on addons.mozilla.org.
