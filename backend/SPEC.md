## Context
We are creating the backend of an app which will become (1) a browser extension for Firefox (primary goal) (2) telegram bot (3) Whatsapp bo to help an NGO which tracks conflicts and compiles risk reports/assessments stay in touch with their humanitarian experts between reports and update their info accordingly.

The experience needs to be frictionless, privacy-preserving and customisable.

### Backend

The backend will consist of a daily job that prepares survey data, and an API that allows for expert registration, and how the experts will interface with the data.

#### Expert registration

1. Form where experts themselves or NGO's analysts can register a group of experts and match them to the risk situation they are tracking

#### Daily job (survey preparation)
1. DONE IN backend/acaps_client.py and backend/latest.py (reuse these scripts):
   - Use API to fetch the latest report on expert group area (assuming experts are linked to a single area for now) https://api.acaps.org/api/v1/risk-radar/risk-radar/
   - Pre-process data to make it easy to digest for a light-weight LLM (keep only 3 most recent risk-assessments, or 1 most recent if the context window would get depleted when keeping 3) (latest.py contains this)

2. Call LLM hosted on external server to ask LLM to formulate questions to be served to experts. 
   - Prompt suggestion: 
   "Using the risk assessment provided, prepare top five pressing questions for the updates to this risk, that require updates from an expert on a 1-5 likert scale (how likely, how pressing, how urgent... etc.). 
   
   Also top 5 binary questions (yes/no). The experts are humanitarian experts or people working in conflict management/social scientists, etc. and usually they live near the affected areas. 
   
   Make sure the questions are tailored to people weighing in using their knowledge and things they may have found out on the ground (rumours, word-of-mouth, etc.), not questions that require government insiders."
   - LLM will be hosted on server, so hit the service, provide the prompt and extract questions

3. Get questions from previous workflows and prepare them to send to frontend to create the survey

#### API
- WRITE OPEN API SPEC FOR THIS

An API will be exposed by this service that exposes the data about the experts and the prepared survey information.

##### Endpoints

1. POST endpoint for user registration, mapping agent to group
2. GET endpoint that outputs an existing survey to take for expert (check beforehand whether they have already responded to the most recent rationale update and return no results if they have)
3. POST endpoint to allow the expert passing in unstructured data
4. PUT endpoint for providing the answers to the survey, as an expert fills them out
5. GET that If the article in the window matches to one of the risk scores, comment on article directly 