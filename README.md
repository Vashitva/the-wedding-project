# The Wedding Project

A wedding website and installable app, built for an Indian wedding: a one-page
site for guests, an RSVP that answers per invitation and per function rather
than per person, and a private dashboard for the couple with live headcounts and
a CSV export for the caterers.

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

The wedding is four functions — **ring ceremony, sangeet, haldi and shadi** —
with meal options of vegetarian, Jain, non-vegetarian and a children's plate,
and an FAQ covering what to wear, which colours to avoid, and what happens at a
baraat. Every function is a separate event guests answer for individually, so a
guest invited only to the shadi never sees the rest.

Each one also gets **its own page** at `/events/<id>`, generated from the same
config — see "The four pages" below.

Rename, reorder or delete functions freely — but if you change an event's `id`,
update the `events` array of every invitation in `data/guests.json` to match, or
those guests will have nothing to accept.

The **guest list** is `data/guests.json`. Each entry is one *invitation* (a
"party"), which is how invitations actually work — a household answers together:

```json
{
  "id": "okafor-family",
  "code": "HAZEL",
  "displayName": "The Okafor Family",
  "events": ["mehendi", "sangeet", "baraat", "ceremony", "reception"],
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

**The landing** is a full-bleed white floral frame with a generated backdrop —
see "The landing" below for how to put your own photograph or clip behind it.

**Icons** are generated too, not drawn by hand:

```bash
npm run icons
```

Edit the three colours at the top of `scripts/generate-icons.mjs` to restyle them.
Both generators share a small PNG encoder in `scripts/lib/png.mjs`, so neither
pulls in an image library.

---

## The landing

The first screen is a white frame shot **through** flowers, in two planes:

- **the backdrop** — a wall of white blooms in the middle distance, lit from
  the upper right and falling into cool shadow at the lower left, with the
  centre lifted warm where the names sit;
- **the foreground** — blooms right up against the lens, wide open and far out
  of focus, crowding the edges with the centre held clear.

The two move at different rates as you scroll — the near plane travels
furthest, and against it the backdrop barely drifts — which is what gives the
landing depth rather than a painted-on blur. Over the top: a white veil that
lifts the flowers back rather than darkening them, a vignette that falls to a
soft warm grey so the frame reads as a frame, a fine multiply grain, and the
names racking into focus. The frame ends on a clean cut into the page below.

High-key throughout — nothing here goes near black — but with real tonal range.
A shadow that only drops a few percent reads as no shadow at all, which is the
difference between a photograph and a pattern.

The shade the key light leaves is **warm ivory, not grey**. A cool shadow on a
white page reads as an overcast day rather than as light, and greys the whole
frame; that is the single value to reach for (`SHADOW` in the generator, plus
the vignette in `globals.css`) if the landing ever looks murky.

Both planes ship already in place — `public/hero.png` and
`public/hero-foreground.png`. They are **painted, not photographed** —
generated together by `scripts/generate-hero.mjs`, deliberately soft and
abstract so they read as atmosphere rather than as a picture of somewhere that
isn't your venue. Regenerate both after editing the palette, the lighting or
the planes:

```bash
npm run hero
```

To use your own, drop the file in `public/` and point `hero.media` at it in
`config/wedding.ts`:

```ts
media: {
  image: "/hero.jpg",             // or leave blank
  foreground: "/hero-foreground.png", // needs alpha and a clear centre; "" to drop it
  video: "/hero.mp4",             // silent, short, loops cleanly
  poster: "/hero-poster.jpg",     // required if video is set
  focalPoint: "50% 45%",          // shift the framing if faces sit high or low
  scrim: 0.34,                    // 0–1, how far the white veil lifts it
}
```

Overwriting `public/hero.png` with a photograph of the same name also works and
needs no config change at all. Clear all three of `image`, `video` and `poster`
and the hero falls back to a pure-CSS wash of blush and sage.

`scrim` is how far the white veil lifts your backdrop. Raise it if your image is
busy and the type starts to fight it; lower it to let more of the picture
through. `focalPoint` is a plain CSS `object-position`.

Above the names sits an optional line in Devanagari — `hero.script` in the
config, defaulting to शुभ विवाह. Swap it for your own script, an invocation your
family uses, or your names; set it to `""` and the line disappears along with
the space it took.

Anyone browsing with **reduced motion** gets the same frame with the movement
removed: no grain flicker, no camera push, no parallax, and a video is replaced
by its poster frame. Nothing disappears.

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
scripts/generate-hero.mjs   Landing backdrop + foreground generator
scripts/lib/png.mjs         Shared minimal PNG encoder
public/hero.png             Generated landing backdrop — replace with a photo
public/hero-foreground.png  Generated near plane, transparent in the middle

src/app/
  page.tsx                  The one-page site (cinematic landing + editorial body)
  events/[slug]/            A page per function, with its own physics
  rsvp/                     Guest RSVP flow
  admin/                    Password-protected dashboard
  offline/                  Shown with no connection; carries the schedule
  manifest.ts               PWA manifest, driven by the config
  api/rsvp/lookup/          Find an invitation
  api/rsvp/                 Submit a reply
  api/admin/export/         CSV export

src/lib/
  particles.ts              Physics for the event pages
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
| `npm run hero` | Regenerate the landing backdrop |

---

## The procession

The schedule is not a list. Each function carries its own `palette` in
`config/wedding.ts` — the ring ceremony in champagne, sangeet in lilac, haldi in
butter, the shadi in blush — and the weekend is moved through sideways, one
full-bleed panel per function, with the ambient glow behind the track following
whichever one is in view. Each panel links through to that function's own page.

```ts
palette: { bg: "#eaf0e4", accent: "#61794f", ink: "#2c3a26" },
```

They are pale washes rather than saturated fields, so the procession stays part
of a white floral page; `ink` has to read on `bg`, and `accent` is used for the
date, the venue link and that function's tick in the position indicator.

It is a native scroll-snap track, so it swipes on a phone, scrolls with a
trackpad, and takes arrow keys once focused. The prev/next buttons and the tick
marks are there for everyone else — the ticks double as a jump list.

---

## The four pages

Every function has a page of its own at `/events/<id>`, built from the same
config entry and prerendered at build time. Each opens on a full-bleed frame in
that function's colour, running its own physics.

The simulation lives in `src/lib/particles.ts`: one integrator — velocity,
gravity, drag, a wind field and a swirling turbulence term — with four force
profiles over it. Nothing is keyframed.

| Function | `animation` | What it is |
| --- | --- | --- |
| Ring ceremony | `rings` | Near-weightless gold motes drifting up on warm air |
| Sangeet | `sangeet` | Lilac orbs rising with a fast flutter, so the drift has a pulse |
| Haldi | `haldi` | Turmeric with real weight and drag, breaking up as it falls |
| Shadi | `petals` | A shower of petals, each swinging as it turns edge-on |

### The rings

The ring ceremony gets a second layer on top of its motes: two gold rings that
fall into frame, bounce, spin down and settle interlocked
(`src/components/RingDrop.tsx`).

The fall is real ballistics — gravity, restitution, angular momentum, energy
lost at every contact, a spark burst on each bounce, and a contact shadow that
tightens and darkens as the ring comes down. The *landing* is a critically
damped spring onto a fixed pose, because a freely tumbling rigid body will not
reliably come to rest in a composition worth looking at, and this one has to
land the same way for every guest.

The two rings differ the way a pair actually does — one plain wide band, one
slimmer with a stone. Nothing in the code encodes who wears which.

`floorFor()` is where they come to rest, as a fraction of the frame; the
simulation, the renderer and the rest pose all read from it, so moving the
rings up or down is one number. Reduced motion skips the drop and paints the
settled composition.

### The petals

The petals are the point of the particle engine. A falling petal turns edge-on and
back; the same phase both narrows the sprite and pushes it sideways, so it
swings as it falls instead of dropping straight. That one coupling is the
difference between a petal and a falling `div`.

Two numbers matter if you tune a profile. **Terminal velocity is
`gravity / drag`** — if that is lower than the frame height divided by the
lifetime, particles expire mid-air and the field looks sparse and top-heavy.
And `count` is scaled by canvas width, so a phone never draws a desktop's
worth.

The canvas stops completely when it scrolls off screen or the tab is hidden,
and reduced motion gets one painted frame of the same scene, held still —
never a blank rectangle.

---

## The rangoli

`src/components/Rangoli.tsx` generates the figure from rotational symmetry —
a centre bindu, an eight-petal lotus, a twelve-petal middle ring, twenty-four
paisley scallops and a ring of dots — rather than shipping a drawing. It traces
itself inside out, the way one is actually laid.

Every path is normalised to `pathLength="1"`, so drawing it is a single
dashoffset per path with nothing to measure; it works at any size and any
stroke width. It appears behind the couple's names on the landing and as a
watermark behind the procession. Reduced motion gets the finished figure
immediately rather than a blank square.

---

## A note on the palette and the type

White floral. Near-white paper throughout, with a dusty rose (`--color-bloom`),
a soft sage (`--color-leaf`) and a muted champagne (`--color-gold`) carrying the
accents. Colour is kept to the flowers and the flourishes; the page itself stays
white. All of it is defined once at the top of `src/app/globals.css`.

Four faces, and the flourish is the point:

- `--font-script` — **Pinyon Script**, a copperplate, reserved for the couple's
  names and the wordmark. Unreadable at paragraph size, lovely at display size.
- `--font-display` — **Italiana**, every heading. An art-nouveau face: high
  waist, hairline strokes, botanical. It ships one upright weight and no
  italic, so headings must not be slanted — a synthesised oblique on a face
  like this looks broken.
- `--font-body` — **Inter**, left alone to do the reading. The decoration is
  carried by the two display faces; the paragraphs stay out of the way.
- `--font-deva` — **Tiro Devanagari Hindi**, only for the optional script line.

The section dividers are an eight-petal lotus (`src/components/Ornament.tsx`)
and the app icon is a six-petal bloom on dusty rose, built from the same
construction as the flowers in the backdrop.

**The site is light only, deliberately.** Every part of the design is a pale
surface — the backdrop is white flowers, the panels are pale washes, the ornament
is a line drawing. A dark scheme would not be this site with the lights off, it
would be a different one, and the header floating over a permanently pale hero
had no legible dark treatment.

---

## A note on dates and times

All times are formatted in the wedding's own time zone (`timeZone` in the
config), never the guest's. A guest in London sees the ceremony at 4:00pm
because that is when it starts — which is the only time that matters — and it
keeps server and browser rendering identical.
