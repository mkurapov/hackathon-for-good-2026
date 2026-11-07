### ACAPS Extension

### Context

This is a browser extension for humanitarian experts that will provide regular feedback to ACAPS (an independent humanitarian analysis organisation that monitors more than 100 crises around the world every day), through various ways: unstructured data, structured survey questions. 

### Users

The typical profiles of humanitarian experts are:

- Conflict experts, often active on social media
- Anticipatory action and early warning practitioners
- Researchers
- Local NGO leaders
- Anyone else with a strong interest in anticipatory analysis

### User flows

#### 1. Registration

A user must be able to receive an invite code/link from ACAPS, that is linked to their expert profile. They should not provide any personal information at this point, assume ACAPS has this already.

#### 2. Provide unstructured data to ACAPS. 

A user must be able to pass along unstructured data to ACAPS (text based). It will call an API to POST this information.

#### 3. Go through a directed ACAPS created survey (with 10 questions)

The example format will be akin to the text below, with five forecasting questions, and five binary questions about the verification of data.

##### Predictive, qualitatitve questions
*(Designed for Humanitarian/Conflict Experts to assess Likelihood and Urgency based on ground truth)*

1.  **Military Loyalty & Friction:** While the update claims "no visible fractures" following Vladimir Padrino López's removal, what specific ground-level indicators suggest whether military loyalty is shifting or if there are unreported mutiny risks within key units? *(Likelihood of internal conflict: 1-5)*
2.  **Humanitarian Access vs. Economic Claims:** Despite the reported economic agreements and oil dispatches, how would you rate the actual accessibility of food and healthcare services for rural populations in high-risk areas compared to early 2026? *(Urgency/Impact on civilians: 1-5)*
3.  **Opposition Safety & Surveillance:** The text notes over 400 opposition leaders were released; from a social science perspective, is there evidence these releases are genuine or if they remain under surveillance/trap conditions on the ground? *(Likelihood of political repression: 1-5)*
4.  **US Pressure & Local Compliance:** With US political pressure continuing and naval forces still present, what specific local community behaviors suggest compliance with new policies versus active resistance to US demands in border regions? *(Pressingness of diplomatic friction: 1-5)*
5.  **NSAG Activity & Stability:** Given the "tentative signs of short-term improvement," are there emerging rumors or word-of-mouth suggesting a potential collapse in state services within the next quarter, specifically regarding non-state armed group (NSAG) activity? *(Likelihood of rapid deterioration: 1-5)*

##### Accuracy questions
*(Yes/No verification for ground reality vs. official narrative)*

1.  **Military Friction:** Is there active, organized resistance from former Chavista loyalists against Rodríguez's cabinet on the ground following Padrino López's removal? (Yes / No)
2.  **Food Security:** Are food supply chains in rural Venezuela functioning at a level that prevents acute malnutrition spikes compared to pre-2026 levels? (Yes / No)
3.  **Opposition Status:** Is there credible evidence that released opposition leaders are operating freely or if they remain under house arrest/monitoring? (Yes / No)
4.  **Displacement Nature:** Are displaced populations in high-risk areas returning to their homes voluntarily without coercion from new authorities? (Yes / No)
5.  **Naval Presence Impact:** Is there a verified increase in restricted access to humanitarian aid due to ongoing US naval presence off the coast, despite claims of reduced likelihood for blockades? (Yes / No)

#### 4. Pop up when browsing article relevant to a risk score

If user is browsing a news article (for now, through a predefined list of domains but could be more complicated later), and if the article matches to a risk that the expert is assigned to, the extension will prompt unstructured feedback from the expert (using the articles metadata as source), and also prompt to do an outstanding survey, if exists.

Additionally, the expert could highlight text about the article, attach a comment to it, as a prompt to the unstructured text flow.

### Requirements
- It should match the styling of https://acaps.org site
- The first target platform is Firefox (since it has VPN - more secure for these humanitarian experts).
