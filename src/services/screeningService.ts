import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "openai/gpt-oss-120b";

export interface ScoreBreakdown {
  technicalSkills: number;
  relevantExperience: number;
  growthProduct: number;
  roleSpecific: number;
  ownershipCollaboration: number;
}

export interface ScreeningResult {
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendation: "apply" | "maybe" | "skip";
  tailoredSummary: string;
}

/* -------------------------------------------------------------------------- */
/* SHARED SCORING CONTRACT                                                    */
/* -------------------------------------------------------------------------- */

const SCORING_CONTRACT = `
You are an expert technical recruiter.

Evaluate the candidate using EXACTLY these dimensions:

1. technicalSkills (0-30)
   Core technical skills required by the role.

2. relevantExperience (0-25)
   Relevance of professional experience and responsibilities.

3. growthProduct (0-20)
   Growth engineering, experimentation, metrics, conversion,
   product thinking, user impact.

4. roleSpecific (0-15)
   Role-specific tools, frameworks, technologies, and domain
   requirements mentioned in the job description.

5. ownershipCollaboration (0-10)
   Ownership, communication, collaboration, remote work,
   leadership, initiative.

SCORING RULES:

- Only score based on evidence explicitly present in the resume.
- Do not invent skills or experience.
- Direct experience gets full credit.
- Transferable experience gets partial credit.
- Missing experience gets no direct-match credit.
- Match score must equal:

technicalSkills
+ relevantExperience
+ growthProduct
+ roleSpecific
+ ownershipCollaboration

- matchScore must be between 0 and 100.

RECOMMENDATION RULES:

- Apply:
  Strong overall alignment with the core requirements. Missing skills
  should mainly be learnable or non-critical.

- Maybe:
  Reasonable overall alignment, but there are meaningful gaps in tools,
  domain experience, or role-specific requirements.

- Skip:
  The candidate lacks important core requirements or has a substantial
  mismatch with the role.

- Do not recommend Skip merely because the candidate lacks one or two
  preferred technologies.

- The recommendation must be consistent with the score, matched skills,
  missing skills, strengths, and gaps.
`;

/* -------------------------------------------------------------------------- */
/* NORMAL ANALYSIS                                                            */
/* -------------------------------------------------------------------------- */

export async function analyzeJobFit(
  resume: string,
  jobDescription: string,
): Promise<ScreeningResult> {
  const response = await client.chat.completions.create({
    model: MODEL,

    /*
     * Temperature 0 makes the scoring as
     * deterministic as possible.
     */
    temperature: 0,

    max_completion_tokens: 1600,

    response_format: {
      type: "json_object",
    },

    messages: [
      {
        role: "system",
        content: `
${SCORING_CONTRACT}

Return ONLY valid JSON.

Do not include:
- markdown
- code fences
- explanations outside JSON
- internal reasoning
`,
      },

      {
        role: "user",
        content: `
Analyze this resume against the job description.

Resume:
${resume}

Job Description:
${jobDescription}

Return a COMPLETE JSON object based on the actual resume and job description.

IMPORTANT:
The structure below is a SCHEMA, NOT an example response.
Do NOT copy the empty values. Every field must contain the actual analysis.

{
  "matchScore": <calculated score>,
  "scoreBreakdown": {
    "technicalSkills": <0-30>,
    "relevantExperience": <0-25>,
    "growthProduct": <0-20>,
    "roleSpecific": <0-15>,
    "ownershipCollaboration": <0-10>
  },
  "matchedSkills": [
    "<actual matching skill>"
  ],
  "missingSkills": [
    "<actual missing requirement>"
  ],
  "strengths": [
    "<specific strength supported by the resume>"
  ],
  "gaps": [
    "<specific gap based on the job description>"
  ],
  "recommendation": "<apply|maybe|skip>",
  "tailoredSummary": "<exactly two professional sentences>"
}

Rules:
- Every field must contain the actual analysis.
- Do not return empty strings.
- Do not return empty arrays when relevant evidence exists.
- matchedSkills: provide at least 3 important matches when evidence exists.
- missingSkills: provide at least 2 meaningful missing requirements when evidence exists.

- recommendation must be exactly:
  "apply"
  "maybe"
  "skip"

- strengths: 2-5 items
- gaps: 2-5 items
- matchedSkills: most important overlaps
- missingSkills: important missing requirements
- tailoredSummary: exactly 2 professional sentences

- matchScore MUST equal the sum of the
  five scoreBreakdown values.

- Do not invent experience.
- Do not invent skills.
- Do not give credit for technologies merely
  because they are common in the industry.
- recommendation must follow the recommendation rules in the scoring contract.
`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Empty response from Groq.");
  }

  try {
    const result = JSON.parse(text) as ScreeningResult;

    /*
     * Defensive defaults.
     *
     * This prevents the frontend from receiving
     * undefined values for fields that it expects
     * to be arrays.
     */
    result.matchedSkills = Array.isArray(result.matchedSkills)
      ? result.matchedSkills
      : [];

    result.missingSkills = Array.isArray(result.missingSkills)
      ? result.missingSkills
      : [];

    result.strengths = Array.isArray(result.strengths) ? result.strengths : [];

    result.gaps = Array.isArray(result.gaps) ? result.gaps : [];

    /*
     * Make sure scoreBreakdown exists.
     */
    if (!result.scoreBreakdown) {
      throw new Error("Missing scoreBreakdown in model response.");
    }

    /*
     * Calculate the score ourselves rather than
     * trusting the model's matchScore.
     */
    const calculatedScore =
      result.scoreBreakdown.technicalSkills +
      result.scoreBreakdown.relevantExperience +
      result.scoreBreakdown.growthProduct +
      result.scoreBreakdown.roleSpecific +
      result.scoreBreakdown.ownershipCollaboration;

    result.matchScore = calculatedScore;

    return result;
  } catch (error) {
    console.error("Failed to parse JSON:", text);

    throw new Error("Invalid JSON returned by model.");
  }
}

/* -------------------------------------------------------------------------- */
/* STREAMING ANALYSIS                                                         */
/* -------------------------------------------------------------------------- */

export async function analyzeJobFitStream(
  resume: string,
  jobDescription: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const stream = await client.chat.completions.create({
    model: MODEL,

    /*
     * Keep this identical to the normal
     * analysis so the two modes use the
     * same sampling behavior.
     */
    temperature: 0,

    max_completion_tokens: 1600,

    stream: true,

    messages: [
      {
        role: "system",
        content: `
${SCORING_CONTRACT}

Write only the final candidate-facing analysis.

Do not expose internal reasoning.
Do not output JSON.
`,
      },

      {
        role: "user",
        content: `
Analyze this resume against the job description.

Resume:
${resume}

Job Description:
${jobDescription}

Provide the analysis using EXACTLY these sections.

# Overall Fit

Show:

Technical Skills: X/30
Relevant Experience: X/25
Growth/Product: X/20
Role Specific: X/15
Ownership & Collaboration: X/10

Match Score: X/100

The Match Score MUST equal the sum of
the five component scores.

Briefly explain the score.

# Matched Skills

List the most important matching skills.

# Missing Skills

List important missing requirements.

# Key Strengths

Provide 2-5 strengths.

# Gaps to Address

Provide 2-5 gaps.

# Recommendation

State exactly one:

Apply
Maybe Apply
Skip

Then briefly explain why.

# Tailored Resume Summary

Write exactly two professional sentences.

Important:

- Use concise professional English.
- Use the exact scoring methodology above.
- Do not invent experience.
- Do not invent skills.
- Do not output JSON.
- Do not output tables.
- Do not output code.
- Do not output internal reasoning.
`,
      },
    ],
  });

  /*
   * Track how many chunks Groq actually sends.
   *
   * This is intentionally here for debugging.
   * Once we confirm streaming is working,
   * these logs can be removed.
   */
  let chunkCount = 0;

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;

    if (typeof text === "string" && text.length > 0) {
      chunkCount++;

      console.log(`GROQ CHUNK ${chunkCount}:`, JSON.stringify(text));

      /*
       * Immediately forward the chunk
       * to screen.ts.
       */
      onChunk(text);
    }
  }

  console.log(`GROQ STREAM COMPLETE — ${chunkCount} chunks received`);
}
