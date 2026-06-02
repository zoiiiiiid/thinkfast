# ThinkFast

**ThinkFast** is a privacy-centered AI productivity platform that helps users create faster outputs while making sure their own ideas guide the result first.

Unlike a normal chatbot, ThinkFast is designed around two core ideas:

1. **Idea-first prompting**: When a user gives a vague prompt, ThinkFast asks for their own direction before generating an output.
2. **Privacy-first AI use**: Before sending content to AI, ThinkFast checks for personal or sensitive information and encourages safer redaction.

The goal is to help users use AI quickly without fully depending on it and without carelessly exposing private information.

---

## Core Concept

ThinkFast follows this workflow:

```text
User Prompt → Idea Check → Privacy Check → AI Generation → Conversation → Save to Board → Personalized Feed
```

The app is not meant to be just a textbox. It acts as an AI workspace where users can continue conversations, save useful outputs, organize them into boards, and revisit their work later.

---

## Main Features

### Idea Check

ThinkFast checks whether the user's prompt has enough personal direction.

For example, if the user enters:

```text
Make me a reflection about AI dependence.
```

ThinkFast may ask follow-up idea prompts such as:

```text
What is your main point about AI dependence?
Do you think AI helps more than it harms?
Do you want to include a personal experience?
```

This keeps the output fast while making sure the user's own ideas come first.

### Privacy Check

ThinkFast detects possible privacy risks before generation.

It can flag details such as:

- Emails
- Phone numbers
- Addresses
- Student numbers
- School or company names
- Professor or workplace context
- Health, financial, or private personal details

Privacy levels are classified as:

| Risk Level | Meaning |
|---|---|
| Low | General prompt with no sensitive context |
| Medium | Includes school, company, professor, personal context, or business idea |
| High | Includes direct identifiers, financial details, health information, or confidential details |

### Gemini AI Generation

ThinkFast uses Gemini for live AI generation.

If `GEMINI_API_KEY` is not configured, the app can fall back to mock mode so the interface can still be tested.

### Conversations

Generated outputs are shown in a chat-style conversation flow instead of a single static result. Users can continue the conversation after generating an output.

### Boards

Users can save conversations into boards such as:

- School
- Business Ideas
- Quiz Prep
- Personal Writing
- Projects
- Research

### Insights

ThinkFast includes basic insights such as:

- Number of outputs generated
- Privacy warnings detected
- Idea checks triggered
- Recently used modes
- Saved boards

---

## Tech Stack

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Supabase Auth**
- **Supabase Postgres**
- **Gemini API** via `@google/genai`
- **Vercel** for deployment

---

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/thinkfast.git
cd thinkfast
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env.local`

Create a `.env.local` file in the root folder.

Use this format:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

Depending on your Supabase setup, the app may also support:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

Do not expose Gemini or secret keys with `NEXT_PUBLIC_`.

### 4. Run the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key for browser client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Alternative older Supabase key name |
| `GEMINI_API_KEY` | Server-side Gemini API key |
| `GEMINI_MODEL` | Gemini model used for generation |

Important:

- `.env.local` should never be committed to GitHub.
- Use `.env.example` for placeholder values only.
- Add real environment variables in Vercel under Project Settings.

---

## Supabase Setup

This project uses Supabase for authentication and persistence.

Required tables include:

- `profiles`
- `conversations`
- `boards`
- `conversation_boards`
- `tags`
- `feed_cards`
- `privacy_events`
- `user_preferences`

Run the schema file in Supabase SQL Editor if included in the project:

```text
supabase/schema.sql
```

Row Level Security should be enabled so each user can only access their own data.

---

## MVP Flow

A successful MVP test should follow this flow:

```text
Sign up / Log in
→ Create a prompt
→ Idea Check appears if prompt is vague
→ Privacy Check detects risks if present
→ Gemini generates output
→ Conversation continues in chat style
→ Save conversation
→ Add to board
→ Refresh page
→ Saved board and conversation remain
```

---

## Product Direction

ThinkFast is built for users who want AI to help them work faster, but still want their own thinking to guide the result.

The platform is centered on this promise:

```text
Fast AI, guided by your ideas, protected by privacy.
```
