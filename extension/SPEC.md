### Extension

First target: Firefox (since it has VPN)

- Provide 3 flows:
1. Take update survey
Check API for existing surveys to take

2. I have information to share (open ended questions)
POST API to pass in loose data.

3. If the article in the window matches to one of the risk scores, comment on article directly 

- User registration:
1. ACAPS sends a link (random code) that is linked to an agent and within a conflict


FRONTEND SPEC STEPS
6. Optional: allow user to select if they would like to answer open-ended questions
7. If above yes: ask open-ended questions and save intermediate answers even without submission
7. Ask if they would like to update their info/someone from ACAPS to get in touch with them for further discussion
8. Different workflow: if the expert is reading a news article/thread on twitter, etc. where the topics discussed are about the conflict they are consulting on, trigger a dialog through which they can take the survey. The backend will have an API that would match the metadata/title to the current risk and output whether an existing 
