# AI Resume Screener

An AI-powered REST API that analyzes resume–job description fit using the Anthropic Claude API. Built with Node.js, TypeScript, and Express.

## Features

- **Structured Analysis** – Returns JSON with match score, matched/missing skills, strengths, gaps, and a tailored resume summary
- **Streaming Mode** – Real-time streamed analysis via Server-Sent Events
- **REST API** – Clean endpoints, easy to integrate into any frontend or workflow

## Tech Stack

- Node.js + TypeScript
- Express.js
- Anthropic Claude API (`claude-sonnet-4-20250514`)
- Server-Sent Events (streaming)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/latika25/ai-resume-screener.git
cd ai-resume-screener

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Run in development
npm run dev
```

## API Endpoints

### `GET /health`
Returns server status.

### `POST /api/screen`
Structured JSON analysis.

**Request:**
```json
{
  "resume": "your resume text here",
  "jobDescription": "job description text here"
}
```

**Response:**
```json
{
  "matchScore": 82,
  "matchedSkills": ["Node.js", "TypeScript", "AWS", "PostgreSQL"],
  "missingSkills": ["NestJS", "Terraform"],
  "strengths": ["Strong distributed systems background", "Production microservices experience"],
  "gaps": ["No NestJS experience mentioned", "Limited Kubernetes production use"],
  "recommendation": "apply",
  "tailoredSummary": "Backend engineer with 4+ years..."
}
```

### `POST /api/screen/stream`
Same request body, streams analysis as Server-Sent Events.

## Project Structure

```
src/
  index.ts              # Express app entry point
  routes/
    screen.ts           # API route handlers
  services/
    screeningService.ts # Claude API integration + analysis logic
```
