import { Router, Request, Response } from 'express';
import { analyzeJobFit, analyzeJobFitStream } from '../services/screeningService';

export const screenRouter = Router();

// Groq (and most providers) surface rate limits as a 429 with a `status`
// field on the error object. We detect that specifically so the UI can show
// a clear, expected message instead of a generic failure.
function friendlyErrorMessage(err: any): { status: number; message: string } {
  const status = err?.status || err?.response?.status;
  if (status === 429) {
    return {
      status: 429,
      message: "Rate limit hit — please wait about 30 seconds and try again.",
    };
  }
  return { status: 500, message: 'Failed to analyze job fit. Please try again.' };
}

screenRouter.post('/screen', async (req: Request, res: Response) => {
  const { resume, jobDescription } = req.body;

  if (!resume || !jobDescription) {
    res.status(400).json({ error: 'resume and jobDescription are required' });
    return;
  }

  try {
    const result = await analyzeJobFit(resume, jobDescription);
    res.json(result);
  } catch (err) {
    console.error('Screening error:', err);
    const { status, message } = friendlyErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

screenRouter.post('/screen/stream', async (req: Request, res: Response) => {
  const { resume, jobDescription } = req.body;

  if (!resume || !jobDescription) {
    res.status(400).json({ error: 'resume and jobDescription are required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    await analyzeJobFitStream(resume, jobDescription, (chunk) => {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Stream error:', err);
    const { message } = friendlyErrorMessage(err);
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});
