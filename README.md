# Payment Tickets & Karina Estacuy Dashboard

A live Next.js dashboard that pulls from Zendesk and shows:

- Every ticket tagged `payment`, with ticket field **Issue Type = Payment**, or **assigned to Karina Estacuy** (unioned, de-duplicated)
- Status counts, opened/solved this week, avg days open
- A scrollable ticket feed
- **Satisfaction survey comments**, split into positive / negative
- Oldest unresolved tickets table

Your Zendesk API token is **never** placed in any file or sent to the browser. It's read
server-side only, from environment variables, inside `app/api/dashboard/route.ts` and `lib/zendesk.ts`.
The page itself just calls your own `/api/dashboard` endpoint.

## 1. Set up Zendesk API access

You already have an API token. Make sure token access is enabled for your Zendesk account:
**Admin Center → Apps and integrations → APIs → Zendesk API → enable "Token access."**

You'll need three values:

| Variable | Example | Where to find it |
|---|---|---|
| `ZENDESK_SUBDOMAIN` | `workada` | From `workada.zendesk.com` |
| `ZENDESK_EMAIL` | `karina@op.workada.co` | The agent email tied to the token |
| `ZENDESK_API_TOKEN` | *(your token)* | Admin Center → APIs → Zendesk API |

**Important:** since the token was pasted in a chat earlier, treat it as exposed — regenerate a
fresh one in Zendesk (Admin Center → Apps and integrations → APIs → Zendesk API → Add/regenerate
API token) and use the new one below. Never commit it to a file or git repo.

## 2. Run it locally (optional, to test before deploying)

```bash
npm install
cp .env.local.example .env.local
# then edit .env.local and fill in your real values
npm run dev
```

Open http://localhost:3000 — it should show live data from Zendesk.

## 3. Deploy to Vercel

1. Push this folder to a new GitHub repository (Vercel deploys from git):
   ```bash
   git init
   git add .
   git commit -m "Initial dashboard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. Go to https://vercel.com/new and import that repository.
3. Vercel will auto-detect Next.js — no build settings need to change.
4. Before the first deploy (or right after), go to **Project → Settings → Environment
   Variables** and add:
   - `ZENDESK_SUBDOMAIN`
   - `ZENDESK_EMAIL`
   - `ZENDESK_API_TOKEN`
   - `ZENDESK_TARGET_ASSIGNEE_EMAIL` (optional — defaults to `karina@op.workada.co` in code)
5. Deploy. Your dashboard will be live at `https://<your-project>.vercel.app`.

If you ever rotate the Zendesk token, update it in Vercel's Environment Variables and redeploy
(or just wait for the next request — no code change needed).

## How the filtering works

`lib/zendesk.ts` runs three Zendesk searches and merges/de-dupes the results by ticket ID:

1. `type:ticket tags:payment`
2. `type:ticket assignee:<the email you set>`
3. `type:ticket custom_field_<id>:<value>` — the field ID and option value for your "Issue Type"
   field's "Payment" option, resolved automatically at request time via the Ticket Fields API.

If your "Issue Type" field or its "Payment" option is named slightly differently than expected,
open `lib/zendesk.ts` and adjust the strings passed to `resolveCustomFieldOption("issue type", "payment")`.

Satisfaction comments come from Zendesk's Satisfaction Ratings API, filtered down to only the
tickets matched above, and split by `score` (`good`/`good_with_comment` vs `bad`/`bad_with_comment`).

## Notes / things worth knowing

- Data refreshes automatically every 60 seconds in the browser, plus there's a manual Refresh button.
- The dashboard currently reads the last 10 pages (up to ~1,000 tickets) per search query and the
  last 10 pages of satisfaction ratings — plenty for typical volumes, but if you have a very large
  backlog you may want to raise the `pages < 10` caps in `lib/zendesk.ts`.
- This was built and type-checked/built successfully in a sandboxed environment without direct
  access to your live Zendesk instance, so the Zendesk API calls themselves haven't been tested
  against your real account yet — test locally first (`npm run dev`) before or after deploying to
  catch anything specific to your setup (e.g. custom field naming).
