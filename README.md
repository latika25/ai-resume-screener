# AI Resume Screener

An AI-powered tool that analyzes resume–job description fit using the Anthropic Claude API. Built with Node.js, TypeScript, Express, and React.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Claude API](https://img.shields.io/badge/Claude%20API-Anthropic-7c5cbf?style=flat)

## Features

- **Match Score** — 0–100 score showing resume–JD alignment
- **Skill Gap Analysis** — matched vs missing skills at a glance
- **Tailored Summary** — Claude rewrites your resume summary for the specific role
- **Streaming Mode** — real-time analysis via Server-Sent Events
- **Copy to clipboard** — one click to grab your tailored summary

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js, TypeScript, Express.js |
| Frontend | React, TypeScript |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Streaming | Server-Sent Events (SSE) |
| Infra | Docker-ready, deployable to AWS/Railway/Render |

## Getting Started

```bash
# 1. Clone
git clone https://github.com/latika25/ai-resume-screener.git
cd ai-resume-screener

# 2. Backend setup
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# 3. Frontend setup
cd client && npm install && cd ..

# 4. Run backend (port 3000)
npm run dev

# 5. Run frontend (port 3001, separate terminal)
cd client && npm start
```

Get your free Anthropic API key at [console.anthropic.com](https://console.anthropic.com)

## API Reference

### `POST /api/screen`
Structured JSON analysis.

**Request:**
```json
{
  "resume": "your resume text",
  "jobDescription": "job description text"
}
```

**Response:**
```json
{
  "matchScore": 82,
  "matchedSkills": ["Node.js", "TypeScript", "AWS"],
  "missingSkills": ["NestJS", "Terraform"],
  "strengths": ["Strong distributed systems background"],
  "gaps": ["No NestJS experience mentioned"],
  "recommendation": "apply",
  "tailoredSummary": "Backend engineer with 4+ years..."
}
```

### `POST /api/screen/stream`
Same request body — streams analysis as Server-Sent Events in real time.

### `GET /health`
Returns `{ status: "ok" }`.

## Project Structure

```
├── src/
│   ├── index.ts                  # Express entry point
│   ├── routes/screen.ts          # API route handlers
│   └── services/screeningService.ts  # Claude API + streaming logic
├── client/
│   ├── public/index.html
│   └── src/
│       ├── App.tsx               # Full UI with score ring, skill pills, stream view
│       ├── index.tsx
│       └── index.css
├── .env.example
├── package.json
└── tsconfig.json
```

## Architecture

```
Browser → React (port 3001)
              ↓ POST /api/screen
         Express (port 3000)
              ↓
         Anthropic Claude API
              ↓ JSON / SSE stream
         Express → React → UI
```

<img width="1878" height="866" alt="image" src="https://github.com/user-attachments/assets/a1ae47f7-949e-4733-ba8a-db168a82d956" />
<img width="1686" height="842" alt="image" src="https://github.com/user-attachments/assets/191d9070-f972-4b88-b936-80a300507129" />

