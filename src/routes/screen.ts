import { Router, Request, Response } from 'express';
import { analyzeJobFit, analyzeJobFitStream } from '../services/screeningService';

export const screenRouter = Router();

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
    res.status(500).json({ error: 'Failed to analyze job fit' });
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
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.end();
  }
});
