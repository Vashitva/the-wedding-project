# The Wedding Project

A wedding website and installable app: a one-page site for guests, an RSVP
system that answers per invitation rather than per person, and a private
dashboard for the couple with live headcounts and a CSV export for the caterers.

Built with Next.js 16 (App Router), TypeScript and Tailwind CSS 4. No database,
no third-party services, no tracking.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then edit it, see "Configuration"
npm run dev                    # http://localhost:3000
```

For production:

```bash
npm run build
npm start
```

---

## Make it yours

Almost everything guests see lives in **`config/wedding.ts`** — names, the date,
the schedule, travel notes, hotels, the story timeline, the wedding party,
registry links, meal options and the FAQ. Edit that one file and the whole site,
the calendar downloads, the app manifest and the RSVP form follow.

The **guest list** is `data/guests.json`. Each entry is one *invitation* (a
"party"), which is how invitations actually work — a household answers together:

```json
{
  "id": "okafor-family",
  "code": "HAZEL",
  "displayName": "The Okafor Family",
  "events": ["welcome-drinks", "ceremony", "reception", "farewell-brunch"],
  "plusOnesAllowed": 0,
  "members": [
    { "id": "tom-okafor", "firstName": "Tom", "lastName": "Okafor" },
    { "id": "ife-okafor", "firstName": "Ife", "lastName": "Okafor", "isChild": true }
  ]
}
```

- `code` is the word printed on the invitation card. Guests can look themselves
  up with it instead of typing a name.
- `events` controls which events that invitation includes — a guest can only see
  and accept events on their own card. Ids come from `config/wedding.ts`.
- `plusOnesAllowed` is enforced server-side, so nobody can add a fourth cousin.

Edits to `data/guests.json` are picked up without restarting the server.

**Photos** go in `public/gallery/`, listed under `gallery.photos` in the config.
Until the files exist, each tile falls back to a tinted placeholder, so the
section never looks broken.

**Icons** are generated, not drawn by hand:

```bash
npm run icons
```

Edit the two colours at the top of `scripts/generate-icons.mjs` to restyle them.

---

## Configuration

| Variable | Required | What it does |
| --- | --- | --- |
| `ADMIN_PASSWORD` | to open `/admin` | Password for the replies dashboard. Unset means the dashboard stays closed. |
| `ADMIN_SESSION_SECRET` | recommended | Signs the admin session cookie. Unset means sessions drop on every restart. |
| `RSVP_TOKEN_SECRET` | recommended | Signs the short-lived token issued after a guest lookup. Falls back to `ADMIN_SESSION_SECRET`. |

Generate secrets with `openssl rand -hex 32`.

---

## How the RSVP flow works

1. A guest enters a name or their invitation code at `/rsvp`.
2. The server finds the matching invitation and returns it with a signed,
   two-hour token. Several households sharing a surname get a disambiguation
   step first.
3. The guest answers for everyone on the invitation — attending or not, which
   events, meal choice, dietary needs — plus any plus-ones they're allowed.
4. The submission is checked against the invitation server-side and written to
   `data/rsvps.json`.

Guests can come back and change their answer any time before the deadline;
looking up again reloads what they told you.

### What's enforced server-side

None of this depends on the browser behaving:

- Submitting requires a signed token from a successful lookup — a bare party id
  is rejected.
- Every person must be on the invitation being answered.
- Every event must be one that invitation includes.
- Plus-ones cannot exceed the allowance.
- Meal choices must be real options, and attendees must pick one.
- RSVPs are refused after `rsvpDeadline`.
- The lookup endpoint is rate-limited, and a bare first name only resolves when
  it is unique — so the box can't be used to page through your guest list.

---

## The dashboard

`/admin`, behind `ADMIN_PASSWORD`. Live headcounts per event, kitchen numbers per
meal, allergies collected in one place, every reply in full, who you're still
waiting on (with their invitation codes), and the song requests. **Export CSV**
gives you one row per person — including the people who haven't replied — which
is the format caterers and venues actually ask for.

---

## The app

The site is a PWA. Guests can install it from the browser (Chrome and Edge offer
a prompt; iOS uses Share → Add to Home Screen), and it keeps working without a
connection — which matters at rural venues with no signal. The schedule, travel
notes and FAQ are cached, and a dedicated offline page carries the weekend's
timings and addresses.

Replies and the dashboard are never cached; those always go to the network.

---

## Where the data lives

RSVPs are a single JSON file at `data/rsvps.json`, written atomically
(temp file, then rename) through a serialised queue, so a crash mid-save can't
truncate it. For a few hundred guests this is easier to back up and inspect than
a database, and there is no service to keep alive between now and the day.

`data/rsvps.json` is gitignored — guest replies should not be in version
control. **Back it up.** Copying the file is a complete backup.

If you deploy somewhere with an ephemeral or read-only filesystem (Vercel,
Lambda), replace the two exported functions at the bottom of `src/lib/store.ts`
with your database of choice. Nothing else in the app touches storage.

---

## Project layout

```
config/wedding.ts           All guest-facing content — edit this first
data/guests.json            The invitation list
data/rsvps.json             Replies (gitignored, created on first RSVP)
scripts/generate-icons.mjs  PWA icon generator

src/app/
  page.tsx                  The one-page site
  rsvp/                     Guest RSVP flow
  admin/                    Password-protected dashboard
  offline/                  Shown with no connection; carries the schedule
  manifest.ts               PWA manifest, driven by the config
  api/rsvp/lookup/          Find an invitation
  api/rsvp/                 Submit a reply
  api/admin/export/         CSV export

src/lib/
  guests.ts                 Invitation list + lookup
  store.ts                  Atomic JSON storage
  validate.ts               Server-side submission checks
  party-token.ts            Signed lookup tokens
  auth.ts                   Admin session
  stats.ts                  Dashboard figures + CSV
  rate-limit.ts             Lookup throttling
  format.ts                 Dates, pinned to the wedding's time zone

public/sw.js                Service worker
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run icons` | Regenerate the PWA icons |

---

## A note on dates and times

All times are formatted in the wedding's own time zone (`timeZone` in the
config), never the guest's. A guest in London sees the ceremony at 4:00pm
because that is when it starts — which is the only time that matters — and it
keeps server and browser rendering identical.
