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
  weddingDate: "2027-05-15T16:00:00-04:00",
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
      "Two people, one very long series of coincidences, and a barn with excellent acoustics. We would love for you to be there.",

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
      id: "welcome-drinks",
      name: "Welcome Drinks",
      start: "2027-05-14T19:00:00-04:00",
      end: "2027-05-14T22:00:00-04:00",
      venue: "The Hollow Tavern",
      address: "12 Mill Street, Rhinebeck, NY 12572",
      description:
        "Come say hello the night before. Drinks, snacks, and no speeches of any kind — we promise.",
      dressCode: "Whatever you travelled in",
      optional: true,
    },
    {
      id: "ceremony",
      name: "The Ceremony",
      start: "2027-05-15T16:00:00-04:00",
      end: "2027-05-15T16:45:00-04:00",
      venue: "Thornfield Barn — the meadow",
      address: "884 Quarry Road, Rhinebeck, NY 12572",
      description:
        "Outdoors on the grass, so please consider your heel-to-soil ratio. Seating opens at 3:30pm.",
      dressCode: "Garden formal",
    },
    {
      id: "reception",
      name: "Dinner & Dancing",
      start: "2027-05-15T17:30:00-04:00",
      end: "2027-05-16T00:00:00-04:00",
      venue: "Thornfield Barn",
      address: "884 Quarry Road, Rhinebeck, NY 12572",
      description:
        "Cocktails on the terrace, dinner at seven, and then a dance floor that we are told is structurally sound.",
      dressCode: "Garden formal",
    },
    {
      id: "farewell-brunch",
      name: "Farewell Brunch",
      start: "2027-05-16T10:00:00-04:00",
      end: "2027-05-16T13:00:00-04:00",
      venue: "The Orchard Room",
      address: "5 Landing Road, Rhinebeck, NY 12572",
      description:
        "Drop in on your way out of town. Coffee, eggs, and a full accounting of the night before.",
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
      id: "beef",
      name: "Braised short rib",
      description: "With horseradish mash and roast carrots",
    },
    {
      id: "fish",
      name: "Hudson trout",
      description: "With brown butter, capers and new potatoes",
    },
    {
      id: "vegetarian",
      name: "Wild mushroom tart",
      description: "With spring greens and a soft herb dressing (vegan on request)",
    },
    {
      id: "kids",
      name: "Children's plate",
      description: "For guests under 12 — pasta, chicken, or whatever works",
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
      question: "Can I bring a plus one?",
      answer:
        "Your invitation lists everyone we have room for by name — you will see them when you look up your RSVP. We wish the barn were bigger.",
    },
    {
      question: "Are children invited?",
      answer:
        "Yes, and there is a kids' menu and a quiet room upstairs. If your invitation names your children, they are very much expected.",
    },
    {
      question: "What should I wear?",
      answer:
        "Garden formal. The ceremony is on grass — flat shoes or block heels will save you. It cools down quickly after sunset, so bring a layer.",
    },
    {
      question: "What if it rains?",
      answer:
        "Everything moves inside the barn. You will not get wet, and we will not be visibly upset about it for more than ten minutes.",
    },
    {
      question: "Is there parking?",
      answer:
        "Yes, free and on site, and you can leave your car overnight and collect it before noon the next day.",
    },
    {
      question: "When should I RSVP by?",
      answer:
        "27 March 2027. After that the caterers start making decisions on your behalf.",
    },
    {
      question: "Can I take photos?",
      answer:
        "During the ceremony, please don't — we have someone for that, and we would love to see your faces rather than your phones. Afterwards, go wild.",
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
