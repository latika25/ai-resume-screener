import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = 'openai/gpt-oss-120b';

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
    max_completion_tokens: 2000,
    temperature: 0.6,
    reasoning_effort: 'low',
    include_reasoning: false,
    response_format: {
      type: 'json_object',
    },
    messages: [
      {
        role: 'system',
        content:
          'You are an expert technical recruiter. Return only valid JSON. Do not include markdown, code fences, preambles, or internal reasoning.',
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
}

Rules:
- Do not invent experience or skills.
- Keep the analysis factual and concise.
- recommendation must be exactly apply, maybe, or skip.
- tailoredSummary must be exactly two professional sentences.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() || '';

  if (!text) {
    throw new Error('Groq returned an empty analysis response.');
  }

  try {
    return JSON.parse(text) as ScreeningResult;
  } catch (error) {
    console.error('Failed to parse Groq JSON response:', text);
    throw new Error('Groq returned an invalid JSON response.');
  }
}

export async function analyzeJobFitStream(
  resume: string,
  jobDescription: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const stream = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 2500,
    temperature: 0.6,
    reasoning_effort: 'low',
    include_reasoning: false,
    stream: true,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert technical recruiter. Write only the final answer for the user. Do not expose internal reasoning.',
      },
      {
        role: 'user',
        content: `Analyze this resume against the job description.

Resume:
${resume}

Job Description:
${jobDescription}

Provide a clear professional analysis using exactly these sections:

## Overall Fit
Give a match score from 0-100 and briefly explain the fit.

## Matched Skills
List important skills and technologies from the job description that are demonstrated in the resume.

## Missing Skills
List important requirements from the job description that are missing or not clearly demonstrated.

## Key Strengths
List 3-5 concise strengths that make the candidate a good match.

## Gaps to Address
List 2-4 important gaps or weaknesses.

## Recommendation
Clearly state Apply, Maybe Apply, or Skip, then briefly explain why.

## Tailored Resume Summary
Write a concise, professional 2-3 sentence summary tailored specifically to this job.

Important:
- Use natural, professional English.
- Be factual and concise.
- Do not invent experience, skills, companies, or technologies.
- Do not output JSON.
- Do not output tables.
- Do not output code.
- Do not output internal reasoning.
- Output only the final analysis intended for the candidate.`,
      },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;

    if (typeof text === 'string' && text.length > 0) {
      onChunk(text);
    }
  }
}
