## ThinkFast MVP

ThinkFast is a privacy-centered AI productivity workspace.

Core flow:

`User prompt -> Privacy Check -> Idea Check -> AI Mode -> AI Output -> Save as Card -> Follow-up -> Board`

### Stack

- Next.js + TypeScript
- Tailwind CSS + shadcn/ui baseline
- Supabase (auth + DB + storage ready)
- OpenAI API (generation and AI helpers)
- Vercel-ready app router structure

## Getting Started

1. Install and run:

```bash
npm install
npm run dev
```

2. Copy env values:

```bash
cp .env.example .env.local
```

3. Configure Supabase and run SQL in `supabase/schema.sql`.

4. Open [http://localhost:3000](http://localhost:3000).

### Main Pages

- `/` landing page
- `/auth` login/signup
- `/feed` personalized card feed
- `/create` template-based task starter
- `/workspace` prompt + privacy/idea checks + generation
- `/boards` board management
- `/insights` usage dashboard

### API Endpoints

- `POST /api/check-privacy`
- `POST /api/check-idea`
- `POST /api/generate`
- `POST /api/conversations`
- `GET,POST /api/boards`
- `POST /api/conversation-boards`
- `POST /api/generate-feed-cards`
- `GET /api/feed`
- `GET /api/insights`

### Privacy Defaults

- Redacted prompt is stored by default.
- Raw prompt is opt-in only from the workspace UI.
- Privacy warnings are shown for medium/high risk.
- Privacy First mode can be selected quickly when sensitive details are detected.
