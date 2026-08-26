import { Router, Request, Response } from "express";
import {
  analyzeJobFit,
  analyzeJobFitStream,
} from "../services/screeningService";

export const screenRouter = Router();

function friendlyErrorMessage(err: any): { status: number; message: string } {
  const status = err?.status || err?.response?.status;

  if (status === 429) {
    return {
      status: 429,
      message: "Rate limit hit — please wait about 30 seconds and try again.",
    };
  }

  return {
    status: 500,
    message: "Failed to analyze job fit. Please try again.",
  };
}

screenRouter.post("/screen", async (req: Request, res: Response) => {
  const { resume, jobDescription } = req.body;

  if (!resume || !jobDescription) {
    res.status(400).json({
      error: "resume and jobDescription are required",
    });
    return;
  }

  try {
    const result = await analyzeJobFit(resume, jobDescription);

    res.json(result);
  } catch (err) {
    console.error("Screening error:", err);

    const { status, message } = friendlyErrorMessage(err);

    res.status(status).json({ error: message });
  }
});

screenRouter.post("/screen/stream", async (req: Request, res: Response) => {
  const { resume, jobDescription } = req.body;

  if (!resume || !jobDescription) {
    res.status(400).json({
      error: "resume and jobDescription are required",
    });
    return;
  }

  res.status(200);

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");

  res.setHeader("Cache-Control", "no-cache, no-transform");

  res.setHeader("Connection", "keep-alive");

  res.setHeader("X-Accel-Buffering", "no");

  res.setHeader("Transfer-Encoding", "chunked");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  res.write(": stream-start\n\n");

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": keep-alive\n\n");
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
  });

  try {
    await analyzeJobFitStream(resume, jobDescription, (chunk) => {
      if (res.writableEnded || res.destroyed) {
        return;
      }

      res.write(
        `data: ${JSON.stringify({
          text: chunk,
        })}\n\n`,
      );
    });

    if (!res.writableEnded) {
      res.write("data: [DONE]\n\n");

      res.end();
    }
  } catch (err) {
    console.error("Stream error:", err);

    if (!res.writableEnded && !res.destroyed) {
      const { message } = friendlyErrorMessage(err);

      res.write(
        `data: ${JSON.stringify({
          error: message,
        })}\n\n`,
      );

      res.end();
    }
  } finally {
    clearInterval(keepAlive);
  }
});
