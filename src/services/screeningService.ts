import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

export interface ScreeningResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendation: string;
  tailoredSummary: string;
}

export async function analyzeJobFit(
  resume: string,
  jobDescription: string
): Promise<ScreeningResult> {
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [
      {
        role: 'system',
        content: 'You are an expert technical recruiter. Return ONLY valid JSON with no markdown, no backticks, no preamble.',
      },
      {
        role: 'user',
        content: `Analyze this resume against the job description.

Resume:
${resume}

Job Description:
${jobDescription}

Return this exact JSON structure:
{
  "matchScore": <number 0-100>,
  "matchedSkills": [<skills present in both resume and JD>],
  "missingSkills": [<skills in JD but not in resume>],
  "strengths": [<2-3 strong alignment points>],
  "gaps": [<2-3 key gaps>],
  "recommendation": "<apply|maybe|skip>",
  "tailoredSummary": "<2 sentence resume summary tailored to this specific JD>"
}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as ScreeningResult;
}

export async function analyzeJobFitStream(
  resume: string,
  jobDescription: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const stream = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1000,
    stream: true,
    messages: [
      {
        role: 'system',
        content: 'You are an expert technical recruiter.',
      },
      {
        role: 'user',
        content: `Analyze this resume against the job description.

Resume:
${resume}

Job Description:
${jobDescription}

Provide a detailed analysis covering:
1. Overall fit score (0-100)
2. Matched skills
3. Missing skills
4. Key strengths
5. Gaps to address
6. A tailored resume summary for this role`,
      },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) onChunk(text);
  }
}
