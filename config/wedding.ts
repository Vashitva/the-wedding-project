/**
 * ─────────────────────────────────────────────────────────────────────────
 *  EDIT THIS FILE TO MAKE THE SITE YOURS.
 *
 *  Everything the guests see — names, dates, venues, story, FAQ, registry —
 *  lives here. No other file needs to change to customise the wedding.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type EventItem = {
  id: string;
  name: string;
  /** ISO 8601 with timezone offset, e.g. "2027-05-15T16:00:00-04:00" */
  start: string;
  end?: string;
  venue: string;
  address: string;
  description: string;
  dressCode?: string;
  /** Guests only see events their invitation includes. See data/guests.json */
  optional?: boolean;
  /**
   * The colour world of this function. Every ritual already has one — mehendi
   * is green, haldi is turmeric, the pheras are rose and gold — and the
   * schedule moves through them rather than flattening everything to one
   * palette. Kept as pale washes so the procession stays part of a white
   * floral page; `ink` has to read on `bg`.
   */
  palette: { bg: string; accent: string; ink: string };
  /**
   * Which physics runs on this function's own page. Each is a different set of
   * forces on the same particle engine — see src/lib/particles.ts.
   */
  animation: "rings" | "sangeet" | "haldi" | "petals";
  /** Shown on the event's page, under the heading. A paragraph or three. */
  detail: string[];
  /** Practical notes for the page — what to wear, when to arrive, what happens. */
  notes?: { label: string; body: string }[];
};

export type StoryBeat = {
  date: string;
  title: string;
  body: string;
};

export type Person = {
  name: string;
  role: string;
  side: "partnerOne" | "partnerTwo";
  bio?: string;
};

export type RegistryItem = {
  name: string;
  description: string;
  url: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type Hotel = {
  name: string;
  description: string;
  distance: string;
  priceHint?: string;
  bookingUrl?: string;
  phone?: string;
};

export type MealChoice = {
  id: string;
  name: string;
  description: string;
};

export const wedding = {
  /** Shown in the browser tab, share cards and the installed app name. */
  siteName: "Sanjana & Yash",
  tagline: "are getting married",

  couple: {
    partnerOne: { firstName: "Sanjana", lastName: "Desai" },
    partnerTwo: { firstName: "Yash", lastName: "Mehta" },
  },

  /** The headline date — used by the countdown and the "add to calendar" link. */
  weddingDate: "2027-05-15T17:00:00-04:00",
  timeZone: "America/New_York",

  location: {
    city: "Hudson Valley",
    region: "New York",
    country: "USA",
  },

  /** RSVP closes at end of this day. Guests see a read-only view afterwards. */
  rsvpDeadline: "2027-03-27",

  contact: {
    email: "hello@sanjanaandyash.example",
    /** Optional — leave blank to hide from the FAQ / footer. */
    phone: "",
  },

  /** Used for absolute URLs in share cards. Set to your real domain. */
  siteUrl: "https://sanjanaandyash.example",

  hero: {
    headline: "Sanjana & Yash",
    subhead: "May 15, 2027 · Hudson Valley, New York",
    invitation:
      "Three days, two families, one mandap in a Hudson Valley meadow, and a great deal of food. We would love for you to be there.",

    /**
     * An optional line above the names, set in Devanagari. "शुभ विवाह" is a
     * general auspicious-wedding phrase; swap it for your own script, an
     * invocation your family uses, or your names — or set it to "" to hide the
     * line entirely.
     */
    script: "शुभ विवाह",

    /**
     * The landing is a full-bleed cinematic frame. Drop in a photograph or a
     * short silent clip and it becomes the backdrop; with neither, the hero
     * falls back to a graded atmospheric wash that is meant to look
     * deliberate rather than empty.
     *
     * A video needs `poster` too — it is what shows on slow connections,
     * before playback starts, and for anyone browsing with reduced motion.
     */
    media: {
      /** e.g. "/hero.jpg" in /public, or an external URL. */
      image: "/hero.png",
      /**
       * Blooms in front of the lens, drifting faster than the backdrop as you
       * scroll — this is what gives the landing depth rather than a flat
       * picture. Needs transparency, and a clear centre where the type sits.
       * Set to "" to shoot the backdrop straight.
       */
      foreground: "/hero-foreground.png",
      /** e.g. "/hero.mp4". Should be silent, a few seconds, and loop cleanly. */
      video: "",
      /** e.g. "/hero-poster.jpg". Required if `video` is set. */
      poster: "",
      /** CSS object-position — move the framing if faces sit off-centre. */
      focalPoint: "50% 45%",
      /** 0–1. How far the white veil lifts the backdrop so the type stays legible. */
      scrim: 0.34,
    },
  },

  story: {
    heading: "How we got here",
    beats: [
      {
        date: "October 2019",
        title: "A queue for bad coffee",
        body: "We met in line at a conference espresso cart that had run out of everything except decaf. Yash offered Sanjana the last packet of sugar. Sanjana does not take sugar, but said yes anyway.",
      },
      {
        date: "March 2020",
        title: "Long distance, briefly",
        body: "Four hundred miles, one shared spreadsheet of films neither of us had seen, and a standing 9pm phone call that neither of us ever missed.",
      },
      {
        date: "August 2022",
        title: "The apartment with the loud radiator",
        body: "We moved in together and adopted a cat who has never once acknowledged either of us by name.",
      },
      {
        date: "June 2026",
        title: "The question",
        body: "On a hike Yash had described as 'basically flat', at the top of a hill that was not basically flat, slightly out of breath and entirely sure.",
      },
    ] satisfies StoryBeat[],
  },

  /**
   * The weekend's schedule. `optional: true` events are only shown to guests
   * whose invitation lists them (see the `events` array in data/guests.json).
   */
  events: [
    {
      id: "ring-ceremony",
      palette: { bg: "#f7f2ea", accent: "#a8894e", ink: "#3d3020" },
      animation: "rings",
      name: "Ring Ceremony",
      start: "2027-05-14T18:00:00-04:00",
      end: "2027-05-14T20:00:00-04:00",
      venue: "The Orchard Room",
      address: "5 Landing Road, Rhinebeck, NY 12572",
      description:
        "The rings, the families, and the first of many rounds of sweets. Short, warm, and over before anybody's feet hurt.",
      dressCode: "Indian formal",
      optional: true,
      detail: [
        "Both families meet properly for the first time, the rings are exchanged, and everyone eats far more mithai than they meant to. It runs about two hours, most of which is people talking over each other.",
        "It is the smallest and quietest thing we are doing all weekend, and it is the one we are most nervous about — so please come early and stand near us.",
      ],
      notes: [
        { label: "Arrive by", body: "5:45pm — the exchange itself is right at the start." },
        { label: "Photographs", body: "There will be a lot. Consider that a warning rather than an invitation." },
      ],
    },
    {
      id: "sangeet",
      palette: { bg: "#f1e9f3", accent: "#7d5f90", ink: "#352a3c" },
      animation: "sangeet",
      name: "Sangeet",
      start: "2027-05-14T20:30:00-04:00",
      end: "2027-05-15T00:30:00-04:00",
      venue: "Thornfield Barn",
      address: "884 Quarry Road, Rhinebeck, NY 12572",
      description:
        "The night both families perform, with varying degrees of preparation. Dinner, a dance floor, and a running order nobody will stick to.",
      dressCode: "Indian festive",
      detail: [
        "Two families, one stage, and a running order that has been renegotiated four times already. Somebody's uncle will do a routine nobody asked for. It will be the best part.",
        "Dinner is served through the evening rather than all at once, so eat when you're hungry and dance when you're not.",
      ],
      notes: [
        { label: "Performing?", body: "Send your track to Neha by 1 May or you are dancing to whatever she picks." },
        { label: "Shoes", body: "The floor is barn wood. Heels will find every gap in it." },
      ],
    },
    {
      id: "haldi",
      palette: { bg: "#fbf3dc", accent: "#a5811f", ink: "#453612" },
      animation: "haldi",
      name: "Haldi",
      start: "2027-05-15T09:30:00-04:00",
      end: "2027-05-15T11:00:00-04:00",
      venue: "Thornfield Barn — the courtyard",
      address: "884 Quarry Road, Rhinebeck, NY 12572",
      description:
        "Turmeric paste, applied enthusiastically by everyone who loves us. Genuinely: wear something you will never want to wear again.",
      dressCode: "Yellow, and expendable",
      optional: true,
      detail: [
        "Turmeric, sandalwood and rosewater, ground into a paste and put on our faces, arms and — if the cousins get their way — hair. It is meant to bless and brighten. It also stains absolutely everything it touches.",
        "This is the loudest, messiest, least dignified ninety minutes of the weekend, and we would not skip it for anything.",
      ],
      notes: [
        { label: "Wear", body: "Yellow, and something you are genuinely happy to throw away afterwards." },
        { label: "Turmeric", body: "Comes out of skin in a day or two. Does not come out of fabric. Ever." },
        { label: "Bring", body: "A change of clothes for later, and sunglasses — the courtyard is bright." },
      ],
    },
    {
      id: "shadi",
      palette: { bg: "#fbe9e9", accent: "#b0606d", ink: "#452129" },
      animation: "petals",
      name: "Shadi",
      start: "2027-05-15T17:00:00-04:00",
      end: "2027-05-15T21:00:00-04:00",
      venue: "Thornfield Barn — the meadow mandap",
      address: "884 Quarry Road, Rhinebeck, NY 12572",
      description:
        "The pheras, under a mandap on the grass, followed by dinner and a dance floor we are told is structurally sound.",
      dressCode: "Indian formal",
      detail: [
        "The wedding itself. Yash arrives with a dhol and a procession at five — everyone is welcome to dance him in, and it is the best twenty minutes of the day. The pheras follow under the mandap on the grass.",
        "The priest explains each of the seven steps in English as we take them, so it is easy to follow even if it is your first Hindu wedding. Seating is open, people come and go, and nobody minds.",
        "Dinner is served straight afterwards, and the dancing goes until they make us stop.",
      ],
      notes: [
        { label: "Arrive by", body: "4:45pm if you want to be in the baraat. 5:30pm if you would rather be seated." },
        { label: "Underfoot", body: "The mandap is on grass. Flat shoes or block heels will save you." },
        { label: "During the pheras", body: "Please don't photograph — we have someone for that, and we would rather see your faces." },
      ],
    },
  ] satisfies EventItem[],

  travel: {
    heading: "Getting there & staying over",
    intro:
      "Rhinebeck is about two hours north of New York City. The train is genuinely the nicest way to do it.",
    directions: [
      {
        mode: "By train",
        detail:
          "Amtrak to Rhinecliff–Kingston (RHI) from Penn Station, roughly 1h50m. Taxis meet the train, but book ahead on the Friday.",
      },
      {
        mode: "By car",
        detail:
          "Two hours from Manhattan via the Taconic State Parkway. There is free parking at the barn, and you are very welcome to leave a car overnight.",
      },
      {
        mode: "By air",
        detail:
          "Albany (ALB) is 50 minutes away and usually cheaper. Newark and JFK are both about two and a half hours.",
      },
    ],
    shuttle:
      "A shuttle runs from The Beekman Arms to the barn at 3:00pm, and loops back at 10:30pm and midnight.",
    hotels: [
      {
        name: "The Beekman Arms",
        description:
          "The main block. Rooms held under 'Desai–Mehta' until 27 March.",
        distance: "10 min to the barn",
        priceHint: "From $210/night",
        bookingUrl: "https://example.com/beekman",
        phone: "+1 845 555 0142",
      },
      {
        name: "Wildflower Inn",
        description: "Smaller and quieter, a short walk from the village.",
        distance: "15 min to the barn",
        priceHint: "From $175/night",
        bookingUrl: "https://example.com/wildflower",
      },
      {
        name: "Quarry Road Cabins",
        description:
          "Self-catered cabins, good for families or groups sharing.",
        distance: "5 min to the barn",
        priceHint: "From $260/night",
        bookingUrl: "https://example.com/cabins",
      },
    ] satisfies Hotel[],
  },

  /** Meal options offered in the RSVP form. Empty array hides the question. */
  meals: [
    {
      id: "veg",
      name: "Vegetarian",
      description: "The full thali — this is what most of the menu is anyway",
    },
    {
      id: "jain",
      name: "Jain",
      description: "No onion, garlic or root vegetables, cooked separately",
    },
    {
      id: "nonveg",
      name: "Non-vegetarian",
      description: "Served alongside the vegetarian dishes at dinner",
    },
    {
      id: "kids",
      name: "Children's plate",
      description: "For guests under 12 — mild, and there is always pasta",
    },
  ] satisfies MealChoice[],

  weddingParty: [
    { name: "Neha Desai", role: "Maid of Honour", side: "partnerOne", bio: "Sanjana's sister and lifelong unpaid legal counsel." },
    { name: "Tom Okafor", role: "Bridesman", side: "partnerOne", bio: "Knows every word of every song Sanjana pretends not to like." },
    { name: "Priya Mehta", role: "Best Woman", side: "partnerTwo", bio: "Yash's cousin, and the reason there is a suit that fits." },
    { name: "Dev Raman", role: "Groomsman", side: "partnerTwo", bio: "Roommate, 2014–2018. Still hasn't returned the rice cooker." },
  ] satisfies Person[],

  registry: {
    heading: "Gifts",
    intro:
      "Your being there is genuinely the whole thing. But several of you have asked, so — here you go.",
    items: [
      {
        name: "The honeymoon fund",
        description: "Two weeks in Kerala, and a boat we cannot really justify.",
        url: "https://example.com/registry/honeymoon",
      },
      {
        name: "The house list",
        description: "Plates, pans, and the unglamorous end of adulthood.",
        url: "https://example.com/registry/home",
      },
      {
        name: "Give it away instead",
        description:
          "If you would rather, we are collecting for the Hudson River Foodbank.",
        url: "https://example.com/registry/donate",
      },
    ] satisfies RegistryItem[],
  },

  gallery: {
    heading: "Us, mostly squinting",
    /**
     * Drop images into /public/gallery and list them here.
     * Missing files degrade gracefully to a tinted placeholder.
     */
    photos: [
      { src: "/gallery/01.jpg", alt: "Sanjana and Yash on a beach at dusk" },
      { src: "/gallery/02.jpg", alt: "The two of us at Neha's wedding" },
      { src: "/gallery/03.jpg", alt: "Yash cooking, badly" },
      { src: "/gallery/04.jpg", alt: "The hike where it happened" },
      { src: "/gallery/05.jpg", alt: "Our cat, ignoring us" },
      { src: "/gallery/06.jpg", alt: "New Year, three years running" },
    ],
  },

  faq: [
    {
      question: "What should I wear?",
      answer:
        "Indian formal for the ceremony and reception, and something bright and comfortable for the mehendi. For the haldi, wear yellow and wear something you are happy to throw away afterwards — the turmeric does not come out.",
    },
    {
      question: "I don't own Indian clothes. Is that a problem?",
      answer:
        "Not at all — a suit or a smart dress is completely fine, and plenty of guests will be in one. If you would like to wear something Indian, we would love that, and Neha has a list of places in New York and online that rent and deliver. Just ask.",
    },
    {
      question: "Are there colours I should avoid?",
      answer:
        "White and black are traditionally avoided at Hindu weddings, and red tends to be left to the bride. Beyond that, the brighter the better — this is not an occasion for beige.",
    },
    {
      question: "What actually happens at the baraat?",
      answer:
        "Yash arrives at the gate with a dhol player and everyone dances them in. It is loud, it lasts about forty-five minutes, and you are very much invited to join rather than watch. Arrive by 10:45am if you want to be part of it.",
    },
    {
      question: "How long is the ceremony?",
      answer:
        "About two hours. The priest explains each step in English as it happens, so it is easy to follow even if it is your first Hindu wedding. Seating is open, people come and go, and lunch is served straight afterwards.",
    },
    {
      question: "Will there be food I can eat?",
      answer:
        "Yes. The menu is largely vegetarian, with Jain food prepared separately and non-vegetarian dishes at dinner. Tell us what you need in your RSVP and it will be handled — including allergies.",
    },
    {
      question: "Is there alcohol?",
      answer:
        "At the sangeet and the reception, yes. The haldi and the ceremony are dry, which is usually for the best given what the haldi involves.",
    },
    {
      question: "Are children invited?",
      answer:
        "Yes, and there is a kids' menu and a quiet room upstairs at the barn. If your invitation names your children, they are very much expected.",
    },
    {
      question: "Do I have to come to everything?",
      answer:
        "No. Come to whatever you can — the RSVP lets you answer for each event separately, and nobody will be counting.",
    },
    {
      question: "When should I RSVP by?",
      answer:
        "27 March 2027. After that the caterers start making decisions on your behalf, and they cater for a crowd.",
    },
  ] satisfies FaqItem[],

  /** Set to false to hide the song-request field in the RSVP form. */
  collectSongRequests: true,
};

export type WeddingConfig = typeof wedding;

/* ── Derived helpers ─────────────────────────────────────────────────── */

export const coupleNames = `${wedding.couple.partnerOne.firstName} & ${wedding.couple.partnerTwo.firstName}`;

export function eventById(id: string) {
  return wedding.events.find((e) => e.id === id);
}

/** Events every guest is invited to, regardless of their invitation. */
export const coreEventIds = wedding.events
  .filter((e) => !e.optional)
  .map((e) => e.id);
