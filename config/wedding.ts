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
  siteName: "Avery & Rohan",
  tagline: "are getting married",

  couple: {
    partnerOne: { firstName: "Avery", lastName: "Lindqvist" },
    partnerTwo: { firstName: "Rohan", lastName: "Mehta" },
  },

  /** The headline date — used by the countdown and the "add to calendar" link. */
  weddingDate: "2027-05-15T12:00:00-04:00",
  timeZone: "America/New_York",

  location: {
    city: "Hudson Valley",
    region: "New York",
    country: "USA",
  },

  /** RSVP closes at end of this day. Guests see a read-only view afterwards. */
  rsvpDeadline: "2027-03-27",

  contact: {
    email: "hello@averyandrohan.example",
    /** Optional — leave blank to hide from the FAQ / footer. */
    phone: "",
  },

  /** Used for absolute URLs in share cards. Set to your real domain. */
  siteUrl: "https://averyandrohan.example",

  hero: {
    headline: "Avery & Rohan",
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
      /** e.g. "/hero.mp4". Should be silent, a few seconds, and loop cleanly. */
      video: "",
      /** e.g. "/hero-poster.jpg". Required if `video` is set. */
      poster: "",
      /** CSS object-position — move the framing if faces sit off-centre. */
      focalPoint: "50% 45%",
      /** 0–1. How far the backdrop is darkened so the type stays legible. */
      scrim: 0.55,
    },
  },

  story: {
    heading: "How we got here",
    beats: [
      {
        date: "October 2019",
        title: "A queue for bad coffee",
        body: "We met in line at a conference espresso cart that had run out of everything except decaf. Rohan offered Avery his last packet of sugar. Avery does not take sugar, but said yes anyway.",
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
        body: "On a hike Rohan had described as 'basically flat', at the top of a hill that was not basically flat, slightly out of breath and entirely sure.",
      },
    ] satisfies StoryBeat[],
  },

  /**
   * The weekend's schedule. `optional: true` events are only shown to guests
   * whose invitation lists them (see the `events` array in data/guests.json).
   */
  events: [
    {
      id: "mehendi",
      name: "Mehendi",
      start: "2027-05-14T15:00:00-04:00",
      end: "2027-05-14T19:00:00-04:00",
      venue: "The Orchard Room",
      address: "5 Landing Road, Rhinebeck, NY 12572",
      description:
        "Henna, chai and far too many snacks. Come and get a design done — the artists work until the last hand is finished. Allow a couple of hours for it to dry, and wear something with short sleeves.",
      dressCode: "Bright and comfortable",
      optional: true,
    },
    {
      id: "sangeet",
      name: "Sangeet",
      start: "2027-05-14T19:30:00-04:00",
      end: "2027-05-14T23:30:00-04:00",
      venue: "Thornfield Barn",
      address: "884 Quarry Road, Rhinebeck, NY 12572",
      description:
        "The night both families perform, with varying degrees of preparation. Dinner, a dance floor, and a running order nobody will stick to.",
      dressCode: "Indian festive",
    },
    {
      id: "haldi",
      name: "Haldi",
      start: "2027-05-15T09:00:00-04:00",
      end: "2027-05-15T10:30:00-04:00",
      venue: "Thornfield Barn — the courtyard",
      address: "884 Quarry Road, Rhinebeck, NY 12572",
      description:
        "Turmeric paste, applied enthusiastically by everyone who loves us. Genuinely: wear something you will never want to wear again.",
      dressCode: "Yellow, and expendable",
      optional: true,
    },
    {
      id: "baraat",
      name: "The Baraat",
      start: "2027-05-15T11:00:00-04:00",
      end: "2027-05-15T11:45:00-04:00",
      venue: "Quarry Road, at the gate",
      address: "884 Quarry Road, Rhinebeck, NY 12572",
      description:
        "Rohan arrives with a dhol, a procession and no sense of hurry. Everyone is welcome to join — this is the dancing-in-the-road part, and it is the best forty-five minutes of the weekend.",
      dressCode: "Indian formal",
    },
    {
      id: "ceremony",
      name: "The Wedding Ceremony",
      start: "2027-05-15T12:00:00-04:00",
      end: "2027-05-15T14:00:00-04:00",
      venue: "Thornfield Barn — the meadow mandap",
      address: "884 Quarry Road, Rhinebeck, NY 12572",
      description:
        "The pheras, under a mandap on the grass. The priest will explain each step in English as we go. Seating is open, lunch follows immediately, and the whole thing runs about two hours.",
      dressCode: "Indian formal",
    },
    {
      id: "reception",
      name: "Reception",
      start: "2027-05-15T19:00:00-04:00",
      end: "2027-05-16T01:00:00-04:00",
      venue: "Thornfield Barn",
      address: "884 Quarry Road, Rhinebeck, NY 12572",
      description:
        "Cocktails, dinner, speeches of unpredictable length, and a dance floor that we are told is structurally sound.",
      dressCode: "Indian formal or black tie",
    },
    {
      id: "farewell-brunch",
      name: "Farewell Brunch",
      start: "2027-05-16T11:00:00-04:00",
      end: "2027-05-16T14:00:00-04:00",
      venue: "The Orchard Room",
      address: "5 Landing Road, Rhinebeck, NY 12572",
      description:
        "Drop in on your way out of town. Chai, poha, eggs for the homesick, and a full accounting of the night before.",
      dressCode: "Comfortable",
      optional: true,
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
          "The main block. Rooms held under 'Lindqvist–Mehta' until 27 March.",
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
    { name: "Nina Lindqvist", role: "Maid of Honour", side: "partnerOne", bio: "Avery's sister and lifelong unpaid legal counsel." },
    { name: "Tom Okafor", role: "Bridesman", side: "partnerOne", bio: "Knows every word of every song Avery pretends not to like." },
    { name: "Priya Mehta", role: "Best Woman", side: "partnerTwo", bio: "Rohan's cousin, and the reason he owns a suit that fits." },
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
      { src: "/gallery/01.jpg", alt: "Avery and Rohan on a beach at dusk" },
      { src: "/gallery/02.jpg", alt: "The two of us at Nina's wedding" },
      { src: "/gallery/03.jpg", alt: "Rohan cooking, badly" },
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
        "Not at all — a suit or a smart dress is completely fine, and plenty of guests will be in one. If you would like to wear something Indian, we would love that, and Nina has a list of places in New York and online that rent and deliver. Just ask.",
    },
    {
      question: "Are there colours I should avoid?",
      answer:
        "White and black are traditionally avoided at Hindu weddings, and red tends to be left to the bride. Beyond that, the brighter the better — this is not an occasion for beige.",
    },
    {
      question: "What actually happens at the baraat?",
      answer:
        "Rohan arrives at the gate with a dhol player and everyone dances him in. It is loud, it lasts about forty-five minutes, and you are very much invited to join rather than watch. Arrive by 10:45am if you want to be part of it.",
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
