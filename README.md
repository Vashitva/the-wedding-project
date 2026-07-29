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
  "events": ["ring-ceremony", "sangeet", "haldi", "shadi"],
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

All three planes ship already in place — `public/hero.png`, `public/hero-2.png`
and `public/hero-foreground.png`. They are **painted, not photographed** —
generated together by `scripts/generate-hero.mjs`, deliberately soft and
abstract so they read as atmosphere rather than as a picture of somewhere that
isn't your venue. The two backdrops are the same garden from different seeds,
so the landing has something to cross-fade between before you have photographs.
Regenerate all three after editing the palette, the lighting or the planes:

```bash
npm run hero
```

### Using your own photographs

Drop the files in `public/` and list them under `hero.media` in
`config/wedding.ts`. **One photograph fills the frame and holds; several
cross-fade slowly behind the type**, the way a title sequence does.

```ts
media: {
  photos: [
    { src: "/hero.jpg",   focalPoint: "50% 45%" },
    { src: "/hero-2.jpg", focalPoint: "50% 30%" },
  ],
  hold: 7,                            // seconds each frame holds
  foreground: "/hero-foreground.png", // needs alpha and a clear centre; "" to drop it
  video: "/hero.mp4",                 // silent, short, loops cleanly
  poster: "/hero-poster.jpg",         // required if video is set
  focalPoint: "50% 45%",              // default framing; per-photo wins
  scrim: 0.34,                        // 0–1, how far the white veil lifts it
}
```

Overwriting `public/hero.png` with a photograph of the same name also works and
needs no config change at all. Empty `photos`, `video` and `poster` and the hero
falls back to a pure-CSS wash of blush and sage.

Four things are worth knowing before you pick the shots:

- **Give every photograph its own `focalPoint`.** It is a plain CSS
  `object-position`. The hero is full-bleed, so the same file is cropped wide on
  a laptop and tall on a phone — a frame that is perfectly composed on your
  screen can behead the entire wedding party on someone else's.
- **The centre of the frame is spoken for.** The names, the countdown and the
  buttons sit dead centre, so choose shots with room there. Two people at the
  edges of a wide frame beats one face in the middle.
- **Export for the web.** Around 2400px on the long edge and 250–400 KB each, as
  WebP or a well-compressed JPEG. Straight-from-the-camera files are 5–8 MB, and
  this is the first thing every guest downloads. Three good frames beat eight.
- **Order matters.** The first is what most guests see, and the only one shown
  to anyone browsing with reduced motion.

A missing file is not a broken landing: a photograph that fails to load is
dropped from the rotation, and if every one fails the hero falls through to the
wash. Only the first frame is precached for offline use — precaching a whole
rotation of full-bleed photographs would make installing the app expensive.

`scrim` is how far the white veil lifts your backdrop. Raise it if your images
are busy and the type starts to fight them; lower it to let more of the picture
through. It applies to every frame, so it is worth grading the set to roughly
the same brightness before you tune it.

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
| `ANTHROPIC_API_KEY` | for the concierge | Powers the "Ask us anything" chat via Claude. |
| `OPENAI_API_KEY` | for the concierge | Same, via OpenAI. Set either or both; with neither, the concierge button hides itself and nothing else changes. |
| `CONCIERGE_PROVIDER` | optional | `anthropic` or `openai`. Overridden by the dashboard, falls back to `concierge.defaultProvider`. |

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

## The concierge

An **Ask us anything** button in the corner of every page opens a chat panel
that answers guests' questions about the wedding. It needs an API key on the
server — Anthropic or OpenAI, either will do; without one it removes its own
button and the site behaves exactly as it did before.

### It only knows what you wrote

`src/lib/concierge/knowledge.ts` renders `config/wedding.ts` into one plain-text
document — every event with its times, venue, dress code and notes, the travel
and hotel sections, the story, the wedding party, the registry, the FAQ. That
document *is* the model's world. It is told to answer from it and nothing else,
and to say it doesn't know and point at your contact email rather than guess.

That is the whole design. A wedding site that confidently states the wrong
venue is worse than one that says nothing, because guests act on it. A guest
sent to `hello@` is mildly inconvenienced; a guest sent to the wrong barn is
not.

Two consequences worth knowing:

- **The reference is byte-stable** — built from config with no timestamps and
  no unordered iteration, so it is identical on every request from every guest.
  That is what lets it sit behind a prompt-cache breakpoint: roughly 2,900
  tokens that the first question pays for and every question after it reads at
  about a tenth of the price.
- **Whatever is wrong in your config, the concierge will repeat with total
  confidence.** Building this surfaced three contradictions in the FAQ that had
  been sitting on the site unnoticed — a dress-code answer referring to a
  mehendi that isn't one of the four functions, a baraat arrival time of
  10:45am for a 5:00pm ceremony, and lunch promised after an evening wedding.
  Reading the generated document (`npm run build` then inspect
  `KNOWLEDGE`) is a surprisingly good proofread of your own content.

### It can only do what the site can do

Two tools, and both map onto something that already exists:

| Tool | What it does | Reuses |
|---|---|---|
| `get_directions` | Returns a real map link, plus your own travel notes | `mapsUrl()` |
| `add_to_calendar` | Offers a calendar file for one or more events | `src/lib/ics.ts` |

Both are declared once in `tools.ts` in neither vendor's dialect — Anthropic
wants `input_schema`, OpenAI wants `function.parameters`, and it's the same JSON
Schema underneath — so each adapter reshapes one definition rather than the two
drifting apart.

Nothing was invented for the chat window, which is the point: the model cannot
promise a capability that doesn't exist, because there is no tool for it. It is
told explicitly never to estimate a journey time from its own knowledge — the
route comes from Google, not from the model.

Tools return a short result for the model **and** an action for the browser,
sent before the sentence describing it. So the button is on screen by the time
the model says "here you go", and pressing it runs the same code the event
pages run. A promise made in the chat is kept by the same builder that keeps it
everywhere else.

**On reminders:** the calendar file is the reminder. The guest's own calendar
does the nagging. The concierge is told to say so plainly rather than implying
it will text them later — push notifications would need VAPID keys, a push
service, and an install-to-home-screen step that most guests won't take.

### The launcher

A flat rectangle in the corner of a floral page reads as a browser widget
rather than as part of the invitation, so the button is a pill with actual
volume: a vertical gradient, a hairline of light along the top edge where a
raised object would catch it, and a **warm** layered shadow — a grey drop
shadow on this palette reads as dirt on the paper. The mark inside it is the
same eight-petal lotus as the section dividers, redrawn at 18px because the
divider's hairline stroke disappears at that size.

On hover or keyboard focus the pill grows about 7% and a band of gold sweeps
around its border. The band is a rotating `conic-gradient` rather than a
stroked SVG, so it needs no knowledge of the shape it travels around — the pill
can change width with its label and the light still tracks the edge.
`--sweep-angle` is registered with `@property` so it can be interpolated;
where that isn't supported the gradient simply sits still, which is a ring
rather than a broken effect. Hover doesn't cut to a different animation, it
leans into the same one: the ring brightens and speeds up, and the lotus turns
faster.

Two things that took a second pass:

- The gradient was originally a filled disc behind the pill at `z-index: -1`,
  which bled gold across its lower half — a negative-z pseudo-element paints
  above its parent's *background* (only in-flow content sits above it). Two
  masks composited with `exclude` punch the middle out, making it a real ring,
  after which paint order stops mattering.
- The pill used to breathe in and out at rest. It made the corner of the page
  restless, it left the button permanently mid-transform for anything trying to
  click it, and worst of all it stole the hover — growth only means something
  if the resting state is still.

Reduced motion keeps the object and drops the movement: the volume and the ring
stay, held still, and hover is still legible through the shadow and the ring
brightening.

### Anthropic or OpenAI

Both are supported. They share everything that decides whether an answer is
correct — the same grounding document, the same tool schemas, the same
executors, the same chunk protocol out to the browser. What differs is one
adapter each in `src/lib/concierge/providers/`, because Anthropic returns
finished content blocks and OpenAI returns tool-call fragments identified by
array index, and a loop that covered both would be harder to follow than two
idiomatic ones.

Which one answers is decided in this order, and **a preference is only honoured
if that provider's key is actually set**:

| # | Source | Set it |
|---|---|---|
| 1 | The dashboard | `/admin` → *The concierge* → Use |
| 2 | The environment | `CONCIERGE_PROVIDER=openai` |
| 3 | The config default | `concierge.defaultProvider` |
| 4 | Whichever key exists | nothing to set |

That last rule is the one worth understanding. `CONCIERGE_PROVIDER=openai`
without `OPENAI_API_KEY` is a mistake, and the useful response is to keep
answering guests on the key that does work while saying plainly what was
ignored — not to switch the concierge off, and not to pretend the preference
was honoured. The dashboard shows both: what is answering now, and what it had
to ignore.

Models are per provider in `concierge.models`. Set them to something your key
can actually reach; a name your account can't get to shows up as an error in
the server log rather than failing silently.

The dashboard's choice lands in `data/settings.json` (gitignored, no secrets in
it — keys only ever come from the environment). It survives a restart but not an
ephemeral filesystem, which is exactly why `CONCIERGE_PROVIDER` exists too. On
Vercel or similar, set the env var and leave the dropdown on *Let the
environment decide*.

`OPENAI_BASE_URL` and `ANTHROPIC_BASE_URL` are read by the SDKs, so either
provider can be pointed at Azure OpenAI, a gateway, or a local model without
touching the code.

### The families section

`concierge.family` in the config ships empty, with a comment explaining why.
Nothing else in the config knows that Neha is Sanjana's sister, so without it
the concierge declines family questions and points at your email — which is a
perfectly good place to start.

Before filling it in, note that **anything you put there, the concierge will
tell anyone who has the link**. The site is `noindex`, but links get forwarded.
Write it like a wedding programme, not a family address book.

### What it doesn't know

It cannot see who it is talking to — not their invitation, not their RSVP, not
which of the four functions they're invited to. Asked, it says so and sends
them to the RSVP page. Wiring the party token through would let it answer
"which events am I invited to?", and is the obvious next step.

### Safety and privacy

- API keys are read server-side only and never reach the browser. The dashboard
  can choose a *provider*; it cannot see or set a key.
- The provider switch is behind the admin session, like everything else in
  `/admin` — it decides where guests' questions get sent.
- Rate limited to 20 questions per 5 minutes per IP, reusing the same limiter
  as the RSVP lookup, so the endpoint can't be used to burn your credit.
- Messages are capped in length and count, and the transcript from the browser
  is rebuilt rather than trusted — roles narrowed, content clipped.
- **Nothing is logged.** A guest asking for directions types where they live;
  that is their personal data in a prompt. It is used for the one request and
  dropped. The conversation lives in the browser tab and nowhere else.
- Tool inputs come from the model, so ids are checked against the config rather
  than interpolated, and free text is URL-encoded before it goes near a link.

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
public/hero-2.png           Second backdrop; the landing cross-fades between them
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
  api/concierge/            Guest concierge chat (streaming)

src/lib/
  concierge/knowledge.ts    Everything the concierge is allowed to know
  concierge/tools.ts        Directions and calendar, the only things it can do
  concierge/provider.ts     Which vendor answers, and how that gets decided
  concierge/providers/      One adapter each: anthropic.ts, openai.ts
  settings.ts               Dashboard preferences (no secrets)
  ics.ts                    Calendar file builder, shared by button and chat
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

The rings are shaded as **real tori** (`src/lib/torus.ts`), not drawn as flat
annuli. The surface is walked point by point, each facet gets its own normal,
and the lighting is Lambert plus a Blinn specular over a warm-above /
cool-below environment. That is what makes the band look round, puts a
highlight that rolls as it turns, and shows you the inside of the far side
through the hole.

Facets from **both** rings go into one depth-sorted buffer, so giving the two
different yaws puts them in different planes and the interlock is genuine
occlusion — no clipping trick. Buffers are allocated once and reused; building
a couple of thousand objects a frame would be pure garbage.

The bands are cut to engagement-ring proportions — a tube radius of about six
percent of the ring — which means the shading has to be smooth, because a thin
band shows every step. Each facet's corners are nudged half a pixel out from
its own centre so neighbours overlap instead of leaving hairline antialiasing
seams; that is materially cheaper than stroking every quad a second time, and
it is what buys the segment count needed to keep the silhouette round.

The fall is real ballistics — gravity, restitution, angular momentum, energy
lost at every contact, a spark burst on each bounce, and a contact shadow that
tightens and darkens as the ring comes down. The *landing* is a critically
damped spring onto a fixed pose, because a freely tumbling rigid body will not
reliably come to rest in a composition worth looking at, and this one has to
land the same way for every guest.

The two rings differ the way a pair actually does — one plain band, one slimmer
with a stone. Nothing in the code encodes who wears which.

The stone is an actual **round brilliant**: a table, eight kite facets, eight
stars and sixteen upper girdle facets, which is the real count for the cut. The
arrangement matters more than any single highlight, because the eye recognises
the pattern of a brilliant long before it reads a specular. Each facet lights
from a source fixed in *screen* space, so the sparkle sweeps across the stone as
the ring rolls, and each carries its own phase offset so neighbours come alight
out of step with one another — that scatter is the difference between a diamond
and a bead. The scintillation is also driven by elapsed time, so the stone keeps
twinkling after the rings have stopped moving; a diamond on a still hand still
sparkles, because the room moves even when the ring does not.

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

Date-only values (`rsvpDeadline`) get one extra step. A bare `YYYY-MM-DD` is
parsed as UTC midnight, so rendering it in a western time zone lands on the
*previous* day — `2027-03-27` printed as 26 March, a full day earlier than the
deadline the server actually enforces. `formatDate` anchors date-only strings
at midday, far enough from either boundary that no offset can move them across
one. Strings that carry a time are left alone: those are real instants.
