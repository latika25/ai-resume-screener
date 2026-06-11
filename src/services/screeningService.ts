import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  const prompt = `You are an expert technical recruiter. Analyze the resume against the job description and return ONLY a JSON object with no markdown, no backticks, no preamble.

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
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as ScreeningResult;
}

export async function analyzeJobFitStream(
  resume: string,
  jobDescription: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const prompt = `You are an expert technical recruiter. Analyze this resume against the job description.

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
6. A tailored resume summary for this role`;

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      onChunk(chunk.delta.text);
    }
  }
}
