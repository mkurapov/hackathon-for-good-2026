# ACAPS expert extension (Firefox)

Firefox extension for ACAPS experts: answer short surveys, share what they see on the ground, ask ACAPS to get in touch, and agree, disagree or comment on news articles about the crises they follow. Requirements: [SPEC.md](SPEC.md). API: [backend/openapi.yaml](../backend/openapi.yaml).

Manifest V3, plain JavaScript, no build step.

## Try it locally

1. Start the API in Docker with a demo panel and survey (no LLM or ACAPS credentials needed). From the repo root:

   ```bash
   docker compose -f docker/docker-compose.yml up -d --build
   docker compose -f docker/docker-compose.yml exec api python seed_demo.py   # prints the invite code DEMO-VEN-2026
   ```

   The database lives in the `groundtruth-data` volume. `docker compose -f docker/docker-compose.yml down -v` wipes it.

2. Load the extension: open `about:debugging#/runtime/this-firefox` in Firefox, click **Load Temporary Add-on…** and pick `extension/manifest.json`. A welcome tab opens.

3. Join: open <http://localhost:8000/join?code=DEMO-VEN-2026>, or type `DEMO-VEN-2026` in the welcome tab. Then click **This is me, continue**.

4. Try an article: serve the test article and open it.

   ```bash
   python3 -m http.server 8766 --directory extension/dev
   ```

   Open <http://localhost:8766/article.html>. The toast appears. Select some text to get the Agree / Disagree / Comment bar.

`docker compose -f docker/docker-compose.yml exec api python seed_demo.py --reset` removes the demo experts and their answers, to start over.

## What it does

| Where | What |
|---|---|
| Toolbar popup | Registration when signed out. Otherwise: the waiting survey, a "Share information" box (`POST /notes`), and "Ask ACAPS to contact me" (`POST /contact-requests`). The sidebar button opens the sidebar. |
| Sidebar | The same home view plus a card for the article in the active tab, the survey, article feedback, and Settings (anonymity level, sign out). |
| Survey | One question per screen, Yes / No questions first, then 1–5 forecasts. Each answer saves as a draft (`PUT …/responses`, `status: draft`) and moves on by itself unless a comment was typed. "Don't know" sends `null`. Next always works. The last question needs an explicit Submit. Keyboard: 1–5, Y / N, D, Enter. |
| News article | On the listed news sites, the content script sends the article to `POST /articles/match`. If it matches the expert's risk, a toast offers one-click Agree / Disagree (sent at once) and links to give more detail or take the survey. Selecting text shows a bar with Agree, Disagree and Comment. The passage is marked on the page and added to the article feedback, which is sent as one `POST /articles/comments` per item (`stance`, `quote`, `text`). |
| Invite link | `GET /join?code=…` on the API. The extension reads the code from that page and opens the welcome tab on the confirm step. |
| Badge | Shows `1` while a survey is waiting. The background checks every 60 minutes. |

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
dev/article.html       test article that matches the demo risk
tests/e2e_firefox.py   end-to-end test in real Firefox (see the file header)
design/                the clickable HTML prototypes the extension is based on
```

Pages talk to the background with `browser.runtime.sendMessage({ type, … })`. The handlers are listed at the bottom of `background.js`. State lives in `storage.local` (token, profile, survey, drafts) and `storage.session` (matched article per tab).

## Things to know

- **Sidebar vs in-page panel.** Firefox only lets an extension open its sidebar from the toolbar button, a menu, a shortcut, or a click on a full extension page. Frames injected into a web page don't qualify. So the toast and selection bar show the feedback or survey view in the sidebar if it is already open, and otherwise in a panel on the right of the page. The toolbar popup opens the real sidebar. Alt+Shift+A also toggles it.
- **Article matching** is done by the API. Today it only matches when the article contains the risk ID or the exact risk title (see "Open questions" in `backend/ARCHITECTURE.md`). That is why the test article's headline contains the demo risk title.
- **News sites** are listed in `manifest.json` under `content_scripts` (Reuters, AP, BBC, Al Jazeera, The Guardian, France 24, RFI, Le Monde, El País, Efecto Cocuyo, ReliefWeb, The New Humanitarian, Crisis Group). `localhost` is included for testing; remove it before publishing.
- **Deploying the API elsewhere**: change `API_BASE` in `src/config.js`, add the API host to `host_permissions`, and add its `/join*` URL to the invite content script's `matches` and the article script's `exclude_matches`.
- **Fonts and logo** match acaps.org. Roboto Condensed and Bebas Neue (both open licence) are bundled in `src/lib/fonts`, and the logo in `icons/`, so no third party sees the expert's browsing.
- **Drafts** are kept in the browser and also saved to the API as drafts. The API has no way to read a draft back, so a survey started on another device starts fresh.
- `web-ext lint` reports `innerHTML` warnings. Every dynamic value goes through `esc()` in `lib/ui.js`. Moving the views to DOM building would silence them before publishing on addons.mozilla.org.
