## Context
We are creating the backend of an app which will become (1) a browser extension for Firefox (primary goal) (2) telegram bot (3) Whatsapp bo to help an NGO which tracks conflicts and compiles risk reports/assessments stay in touch with their humanitarian experts between reports and update their info accordingly.

The experience needs to be frictionless, privacy-preserving and customisable.

### Backend
Requirements for backend:

1. Form where experts themselves or NGO's analysts can register a group of experts and match them to the risk situation they are tracking
2. Use API to fetch the latest report on expert group area (assuming experts are linked to a single area for now)

https://api.acaps.org/api/v1/risk-radar/risk-radar/

3. Pre-process data to make it easy to digest for a light-weight LLM (keep only the risk assessm)

4. Call LLM to create top 5 questions on 1-5 likert scale
   - Is there a human in the loop here?
5. Serve user survey with above question (save intermediate answers)
6. Optional: allow user to select if they would like to answer open-ended questions
7. If above yes: ask open-ended questions and save intermediate answers even without submission
7. Ask if they would like to update their info/someone from ACAPS to get in touch with them for further discussion
8. Different workflow: if the expert is reading a news article/thread on twitter, etc. where the topics discussed are about the conflict they are consulting on, trigger a dialog through which they can take the survey. The backend will have an API that would match the metadata/title to the current risk and output whether an existing 
 
#### APIs

1. API for user registration, mapping agent to group
2. API that outputs an existing survey to take for expert (check beforehand whether they have already responded to the most recent rationale update and return no results if they have)
3. API to allow the expert passing in unstructured data
4. API that If the article in the window matches to one of the risk scores, comment on article directly 