import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
}));

vi.mock("groq-sdk", () => ({
  default: class Groq {
    chat = {
      completions: {
        create: createMock,
      },
    };
  },
}));

import { analyzeJobFit, analyzeJobFitStream } from "./screeningService";

describe("analyzeJobFit", () => {
  beforeEach(() => {
    createMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes arrays and recalculates the match score", async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              matchScore: 1,
              scoreBreakdown: {
                technicalSkills: 20,
                relevantExperience: 15,
                growthProduct: 10,
                roleSpecific: 8,
                ownershipCollaboration: 7,
              },
              matchedSkills: "not an array",
              missingSkills: null,
              strengths: ["Strong delivery"],
              gaps: undefined,
              recommendation: "apply",
              tailoredSummary: "A summary.",
            }),
          },
        },
      ],
    });

    await expect(analyzeJobFit("resume", "job")).resolves.toMatchObject({
      matchScore: 60,
      matchedSkills: [],
      missingSkills: [],
      strengths: ["Strong delivery"],
      gaps: [],
    });
  });

  it("rejects an empty model response", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: "" } }] });

    await expect(analyzeJobFit("resume", "job")).rejects.toThrow(
      "Empty response from Groq.",
    );
  });

  it("rejects malformed JSON", async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: "not json" } }],
    });

    await expect(analyzeJobFit("resume", "job")).rejects.toThrow(
      "Invalid JSON returned by model.",
    );
  });

  it("rejects responses without score breakdown", async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({}) } }],
    });

    await expect(analyzeJobFit("resume", "job")).rejects.toThrow(
      "Invalid JSON returned by model.",
    );
  });
});

describe("analyzeJobFitStream", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("forwards non-empty streamed chunks", async () => {
    async function* chunks() {
      yield { choices: [{ delta: { content: "Hello" } }] };
      yield { choices: [{ delta: { content: " world" } }] };
      yield { choices: [{ delta: { content: "" } }] };
      yield { choices: [{ delta: {} }] };
    }

    createMock.mockResolvedValue(chunks());
    const onChunk = vi.fn();

    await analyzeJobFitStream("resume", "job", onChunk);

    expect(onChunk.mock.calls).toEqual([["Hello"], [" world"]]);
  });
});
