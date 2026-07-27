/** Domain types shared by the server, the API routes and the client forms. */

export type GuestMember = {
  id: string;
  firstName: string;
  lastName: string;
  /** Children get the kids' menu by default and are labelled in the admin view. */
  isChild?: boolean;
};

/**
 * A "party" is one invitation — a household, a couple, a family. Guests look
 * themselves up and then answer for everyone on the invitation at once.
 */
export type Party = {
  id: string;
  /** Printed on the invitation card. Case-insensitive at lookup. */
  code: string;
  displayName: string;
  members: GuestMember[];
  /** Event ids from config/wedding.ts that this invitation includes. */
  events: string[];
  /** How many un-named extra guests this party may bring. */
  plusOnesAllowed?: number;
};

export type MemberResponse = {
  guestId: string;
  /** Denormalised so the admin export stays readable if the roster changes. */
  name: string;
  attending: boolean;
  /** Event ids the guest is actually coming to. Empty when not attending. */
  events: string[];
  mealId?: string;
  dietary?: string;
};

export type PlusOneResponse = {
  name: string;
  mealId?: string;
  dietary?: string;
};

export type Rsvp = {
  partyId: string;
  partyName: string;
  submittedAt: string;
  updatedAt: string;
  email: string;
  phone?: string;
  responses: MemberResponse[];
  plusOnes: PlusOneResponse[];
  songRequest?: string;
  note?: string;
};

/** Shape returned to the browser after a successful lookup. */
export type LookupResult = {
  party: Party;
  existing: Rsvp | null;
};

export type RsvpStats = {
  partiesInvited: number;
  partiesResponded: number;
  guestsInvited: number;
  attending: number;
  declined: number;
  awaiting: number;
  perEvent: { eventId: string; name: string; attending: number }[];
  perMeal: { mealId: string; name: string; count: number }[];
  dietaryNotes: { name: string; note: string }[];
  songRequests: string[];
};
