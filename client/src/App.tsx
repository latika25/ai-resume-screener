import React, { useState, useRef, useCallback } from "react";

interface ScreeningResult {
  matchScore: number;
  scoreBreakdown?: {
    technicalSkills: number;
    relevantExperience: number;
    growthProduct: number;
    roleSpecific: number;
    ownershipCollaboration: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendation: "apply" | "maybe" | "skip";
  tailoredSummary: string;
}

type Mode = "idle" | "loading" | "streaming" | "done" | "error";

function scoreColor(score: number) {
  if (score >= 75) return "var(--green)";
  if (score >= 50) return "var(--yellow)";
  return "var(--red)";
}

function recLabel(r: string) {
  if (r === "apply") return { label: "Strong Apply", color: "var(--green)" };
  if (r === "maybe") return { label: "Worth Trying", color: "var(--yellow)" };
  return { label: "Skip This One", color: "var(--red)" };
}

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
        />

        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />

        <text
          x="70"
          y="64"
          textAnchor="middle"
          fill={scoreColor(score)}
          style={{
            fontFamily: "Space Grotesk",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          {score}
        </text>

        <text
          x="70"
          y="82"
          textAnchor="middle"
          fill="var(--text-muted)"
          style={{
            fontFamily: "Inter",
            fontSize: 11,
          }}
        >
          match score
        </text>
      </svg>
    </div>
  );
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        margin: "3px 3px 3px 0",
      }}
    >
      {text}
    </span>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px 22px",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 12,
        }}
      >
        {title}
      </p>

      {children}
    </div>
  );
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }

    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

function isTableRow(line: string) {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 1;
}

function isTableSeparator(line: string) {
  return /^\|?[\s:-]+\|[\s:|-]*$/.test(line.trim());
}

function renderStreamedMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Tables
    if (isTableRow(line)) {
      const tableLines: string[] = [];

      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }

      const rows = tableLines
        .filter((l) => !isTableSeparator(l))
        .map((l) =>
          l
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim()),
        );

      blocks.push(
        <table
          key={`tbl-${key++}`}
          style={{
            width: "100%",
            borderCollapse: "collapse",
            margin: "10px 0 16px",
          }}
        >
          <tbody>
            {rows.map((cells, ri) => (
              <tr
                key={ri}
                style={{
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {cells.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: "7px 12px",
                      verticalAlign: "top",
                      fontSize: 13,
                      color: "var(--text)",
                    }}
                  >
                    {renderInline(cell, `c-${key}-${ri}-${ci}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );

      continue;
    }

    // Empty line
    if (line.trim() === "") {
      blocks.push(<div key={`sp-${key++}`} style={{ height: 6 }} />);

      i++;
      continue;
    }

    // Normal paragraph
    blocks.push(
      <p
        key={`p-${key++}`}
        style={{
          margin: "0 0 8px 0",
          fontSize: 13,
          lineHeight: 1.8,
          color: "var(--text)",
        }}
      >
        {renderInline(line, `l-${key}`)}
      </p>,
    );

    i++;
  }

  return blocks;
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [mode, setMode] = useState<Mode>("idle");

  const [result, setResult] = useState<ScreeningResult | null>(null);

  const [streamText, setStreamText] = useState("");

  // NEW:
  // True only after the first real text chunk has arrived.
  const [streamStarted, setStreamStarted] = useState(false);

  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  // ── Normal analysis ─────────────────────────────────────────────────────
  const analyze = useCallback(async () => {
    if (!resume.trim() || !jd.trim()) return;

    setMode("loading");
    setResult(null);
    setStreamText("");
    setStreamStarted(false);
    setError("");

    try {
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume,
          jobDescription: jd,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);

        throw new Error(body?.error || `Server error: ${res.status}`);
      }

      const data: ScreeningResult = await res.json();

      setResult(data);
      setMode("done");
    } catch (e: any) {
      setError(e.message || "Something went wrong");

      setMode("error");
    }
  }, [resume, jd]);

  // ── Streaming analysis ─────────────────────────────────────────────────
  const analyzeStream = useCallback(async () => {
    if (!resume.trim() || !jd.trim()) return;

    setMode("streaming");
    setResult(null);
    setStreamText("");
    setStreamStarted(false);
    setError("");

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/screen/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume,
          jobDescription: jd,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);

        throw new Error(body?.error || `Server error: ${res.status}`);
      }

      if (!res.body) {
        throw new Error("Streaming response body is unavailable.");
      }

      const reader = res.body.getReader();

      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");

        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          const payload = line.slice(6);

          if (payload === "[DONE]") {
            setMode("done");
            return;
          }

          try {
            const parsed = JSON.parse(payload);

            if (parsed.error) {
              setError(parsed.error);
              setMode("error");
              return;
            }

            if (typeof parsed.text === "string" && parsed.text.length > 0) {
              // IMPORTANT:
              // The cursor is not displayed until
              // this point is reached.
              setStreamStarted(true);

              setStreamText((prev) => prev + parsed.text);
            }
          } catch {
            // Ignore malformed/incomplete SSE lines.
          }
        }
      }

      setMode("done");
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError(e.message || "Stream failed");

        setMode("error");
      }
    }
  }, [resume, jd]);

  // ── Reset ───────────────────────────────────────────────────────────────
  const reset = () => {
    abortRef.current?.abort();

    setMode("idle");
    setResult(null);
    setStreamText("");
    setStreamStarted(false);
    setError("");
  };

  const rec = result ? recLabel(result.recommendation) : null;

  const canRun = resume.trim().length > 20 && jd.trim().length > 20;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "20px 32px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          ✦
        </div>

        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: "-0.02em",
          }}
        >
          resume
          <span
            style={{
              color: "var(--accent-bright)",
            }}
          >
            screen
          </span>
        </span>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          padding: "32px",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Hero */}
        <div
          style={{
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              marginBottom: 10,
            }}
          >
            Know your fit{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-bright))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              before you apply
            </span>
          </h1>

          <p
            style={{
              color: "var(--text-muted)",
              fontSize: 15,
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            Paste your resume and a job description. Claude analyzes the match,
            flags gaps, and writes you a tailored summary.
          </p>
        </div>

        {/* Input grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              Your Resume
              <span
                style={{
                  color: "var(--text-muted)",
                  fontWeight: 400,
                  marginLeft: 6,
                }}
              >
                paste as plain text
              </span>
            </label>

            <textarea
              rows={14}
              placeholder="Paste your full resume here..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              disabled={mode === "loading" || mode === "streaming"}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              Job Description
              <span
                style={{
                  color: "var(--text-muted)",
                  fontWeight: 400,
                  marginLeft: 6,
                }}
              >
                paste from LinkedIn or careers page
              </span>
            </label>

            <textarea
              rows={14}
              placeholder="Paste the job description here..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              disabled={mode === "loading" || mode === "streaming"}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 32,
            justifyContent: "center",
          }}
        >
          <button
            onClick={analyze}
            disabled={!canRun || mode === "loading" || mode === "streaming"}
            style={{
              padding: "11px 28px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              background: canRun ? "var(--accent)" : "var(--border)",
              color: canRun ? "#fff" : "var(--text-muted)",
              transition: "opacity 0.2s, background 0.2s",
              opacity: mode === "loading" ? 0.7 : 1,
            }}
          >
            {mode === "loading" ? "Analyzing…" : "✦ Analyze Match"}
          </button>

          <button
            onClick={analyzeStream}
            disabled={!canRun || mode === "loading" || mode === "streaming"}
            style={{
              padding: "11px 28px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              background: "transparent",
              color: canRun ? "var(--accent-bright)" : "var(--text-muted)",
              border: `1.5px solid ${
                canRun ? "var(--accent)" : "var(--border)"
              }`,
              transition: "all 0.2s",
              opacity: mode === "streaming" ? 0.7 : 1,
            }}
          >
            {mode === "streaming" ? "⟳ Streaming…" : "⚡ Stream Analysis"}
          </button>

          {(mode === "done" || mode === "error" || mode === "streaming") && (
            <button
              onClick={reset}
              style={{
                padding: "11px 20px",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 14,
                background: "transparent",
                color: "var(--text-muted)",
                border: "1.5px solid var(--border)",
              }}
            >
              ↺ Reset
            </button>
          )}
        </div>

        {/* Normal loading state */}
        {mode === "loading" && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: "3px solid var(--border)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />

            <p>Reading your resume…</p>

            <style>
              {`@keyframes spin {
                to {
                  transform: rotate(360deg);
                }
              }`}
            </style>
          </div>
        )}

        {/* Error state */}
        {mode === "error" && (
          <div
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1.5px solid rgba(248,113,113,0.3)",
              borderRadius: "var(--radius)",
              padding: "16px 20px",
              color: "var(--red)",
            }}
          >
            ✕ {error}
          </div>
        )}

        {/* Stream output */}
        {(mode === "streaming" ||
          (mode === "done" && streamText && !result)) && (
          <div
            style={{
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "24px",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--accent-bright)",
                marginBottom: 16,
              }}
            >
              {mode === "streaming" ? "⟳ Live Analysis" : "Analysis Complete"}
            </p>

            <div
              style={{
                fontFamily: "var(--font-body)",
              }}
            >
              {/* Waiting for first real chunk */}
              {mode === "streaming" && !streamStarted && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "var(--text-muted)",
                    fontSize: 13,
                    padding: "8px 0 12px",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--accent-bright)",
                      animation: "pulse 1.2s ease-in-out infinite",
                    }}
                  />

                  <span>AI is generating the analysis…</span>
                </div>
              )}

              {/* Actual streamed content */}
              {streamText && renderStreamedMarkdown(streamText)}

              {/* Cursor only AFTER first chunk */}
              {mode === "streaming" && streamStarted && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 14,
                    background: "var(--accent-bright)",
                    animation: "blink 1s step-end infinite",
                    marginLeft: 2,
                    verticalAlign: "middle",
                  }}
                />
              )}
            </div>

            <style>
              {`
                @keyframes blink {
                  0%,100% {
                    opacity: 1;
                  }
                  50% {
                    opacity: 0;
                  }
                }

                @keyframes pulse {
                  0%,100% {
                    opacity: 0.35;
                    transform: scale(0.9);
                  }
                  50% {
                    opacity: 1;
                    transform: scale(1);
                  }
                }
              `}
            </style>
          </div>
        )}

        {/* Structured result */}
        {result && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr",
                gap: 16,
              }}
            >
              <div
                style={{
                  background: "var(--surface)",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "24px 16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <ScoreRing score={result.matchScore} />

                {rec && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: rec.color,
                      background: `${rec.color}15`,
                      border: `1px solid ${rec.color}40`,
                      padding: "4px 12px",
                      borderRadius: 20,
                    }}
                  >
                    {rec.label}
                  </span>
                )}
              </div>

              <Card title="Tailored Summary">
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.8,
                    color: "var(--text)",
                  }}
                >
                  {result.tailoredSummary}
                </p>

                <button
                  onClick={() =>
                    navigator.clipboard.writeText(result.tailoredSummary)
                  }
                  style={{
                    marginTop: 14,
                    padding: "7px 16px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    background: "var(--accent-glow)",
                    color: "var(--accent-bright)",
                    border: "1px solid var(--accent)",
                  }}
                >
                  Copy Summary
                </button>
              </Card>
            </div>

            {/* Skills */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Card title="Matched Skills">
                <div>
                  {result.matchedSkills.map((s) => (
                    <Pill key={s} text={s} color="var(--green)" />
                  ))}
                </div>
              </Card>

              <Card title="Missing Skills">
                <div>
                  {result.missingSkills.length === 0 ? (
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 13,
                      }}
                    >
                      None — great coverage!
                    </span>
                  ) : (
                    result.missingSkills.map((s) => (
                      <Pill key={s} text={s} color="var(--red)" />
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Strengths + Gaps */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Card title="Strengths">
                <ul
                  style={{
                    paddingLeft: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {result.strengths.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 13,
                        color: "var(--text)",
                        lineHeight: 1.6,
                      }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Gaps to Address">
                <ul
                  style={{
                    paddingLeft: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {result.gaps.map((g, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 13,
                        color: "var(--text)",
                        lineHeight: 1.6,
                      }}
                    >
                      {g}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}
      </main>

      <footer
        style={{
          padding: "16px 32px",
          borderTop: "1px solid var(--border)",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 12,
        }}
      >
        Built with Node.js · TypeScript · React
      </footer>
    </div>
  );
}
