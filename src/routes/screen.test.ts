import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { analyzeJobFitMock, analyzeJobFitStreamMock } = vi.hoisted(() => ({
  analyzeJobFitMock: vi.fn(),
  analyzeJobFitStreamMock: vi.fn(),
}));

vi.mock("../services/screeningService", () => ({
  analyzeJobFit: analyzeJobFitMock,
  analyzeJobFitStream: analyzeJobFitStreamMock,
}));

import { screenRouter } from "./screen";

const app = express();
app.use(express.json());
app.use("/api", screenRouter);

const result = {
  matchScore: 80,
  scoreBreakdown: {
    technicalSkills: 25,
    relevantExperience: 20,
    growthProduct: 15,
    roleSpecific: 12,
    ownershipCollaboration: 8,
  },
  matchedSkills: ["TypeScript"],
  missingSkills: [],
  strengths: ["Delivery"],
  gaps: ["Testing"],
  recommendation: "apply" as const,
  tailoredSummary: "A summary.",
};

describe("POST /api/screen", () => {
  beforeEach(() => {
    analyzeJobFitMock.mockReset();
    analyzeJobFitStreamMock.mockReset();
  });

  it("returns 400 when required input is missing", async () => {
    const response = await request(app)
      .post("/api/screen")
      .send({ resume: "" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "resume and jobDescription are required",
    });
    expect(analyzeJobFitMock).not.toHaveBeenCalled();
  });

  it("returns the screening result", async () => {
    analyzeJobFitMock.mockResolvedValue(result);

    const response = await request(app).post("/api/screen").send({
      resume: "resume text",
      jobDescription: "job text",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(analyzeJobFitMock).toHaveBeenCalledWith("resume text", "job text");
  });

  it("maps rate-limit failures to a 429 response", async () => {
    analyzeJobFitMock.mockRejectedValue({ status: 429 });

    const response = await request(app).post("/api/screen").send({
      resume: "resume text",
      jobDescription: "job text",
    });

    expect(response.status).toBe(429);
    expect(response.body.error).toContain("Rate limit hit");
  });
});

describe("POST /api/screen/stream", () => {
  it("streams chunks and terminates with DONE", async () => {
    analyzeJobFitStreamMock.mockImplementation(
      async (
        _resume: string,
        _job: string,
        onChunk: (chunk: string) => void,
      ) => {
        onChunk("Hello");
        onChunk(" world");
      },
    );

    const response = await request(app)
      .post("/api/screen/stream")
      .send({ resume: "resume text", jobDescription: "job text" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(response.text).toContain(": stream-start");
    expect(response.text).toContain('data: {"text":"Hello"}');
    expect(response.text).toContain('data: {"text":" world"}');
    expect(response.text).toContain("data: [DONE]");
  });
});
