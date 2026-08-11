import { type EntityKind, type RelationKind, type Visibility } from "@sw/schemas";

/**
 * Development seed content for Barovia.
 *
 * Kept as data, separate from the script that inserts it, so it can be asserted on
 * without a database — see seed-data.test.ts, which checks the thing that actually
 * matters about a seed on this project: that it spans all three clearance tiers.
 *
 * A seed where everything is player-visible would make every spoiler test vacuously
 * pass. The DM-tier entries here exist to be *not* returned, and the pairs that matter
 * are the ones where a single record is partly public and partly secret — the Burgomaster
 * whose name is known and whose true allegiance is not.
 *
 * This is Curse of Strahd's cast as a starting point, to be replaced by the real campaign.
 */

export interface SeedEntity {
  readonly kind: EntityKind;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly visibility: Visibility;
  readonly published: boolean;
  /** Kind-specific columns, matching the detail tables in schema/content.ts. */
  readonly detail: Record<string, unknown>;
}

export interface SeedLink {
  readonly from: string;
  readonly to: string;
  readonly relation: RelationKind;
  readonly note: string | null;
  readonly visibility: Visibility;
}

export const SEED_ENTITIES: readonly SeedEntity[] = [
  // --- Locations -----------------------------------------------------------------
  {
    kind: "location",
    slug: "barovia",
    title: "Barovia",
    summary: "A valley of mist and moonless nights, sealed from the world.",
    body: "The land is bounded on every side by cliffs and by a fog that turns travellers back upon themselves. Nobody leaves. Most have stopped trying.",
    visibility: "public",
    published: true,
    detail: {
      locationType: "region",
      approach: "The mists part just long enough to let you in.",
      secrets: "The mists are Strahd's. They are not a natural phenomenon and they answer to him.",
      dmNotes: "Use the mists to redirect, never to punish. A wall the party can see is scarier.",
    },
  },
  {
    kind: "location",
    slug: "vallaki",
    title: "Vallaki",
    summary: "A walled town that insists, loudly, that all is well.",
    body: "Bunting hangs from every eave. The Baron has decreed a festival, and attendance is not optional.",
    visibility: "public",
    published: true,
    detail: {
      locationType: "settlement",
      approach: "Painted walls, nailed-shut shutters, and far too many banners.",
      secrets:
        "Baron Vallakovich's 'festivals' are a superstition: he believes forced joy keeps Strahd's eye elsewhere. It does not.",
      dmNotes: "Vallaki is a pressure cooker. Give the party three ways to make it worse.",
    },
  },
  {
    kind: "location",
    slug: "castle-ravenloft",
    title: "Castle Ravenloft",
    summary: "The castle on the crag, visible from everywhere in the valley.",
    body: "It watches the valley. Villagers do not point at it.",
    visibility: "player",
    published: true,
    detail: {
      locationType: "dungeon",
      approach: "A causeway over a gorge, and a portcullis that is always already open.",
      secrets: "Strahd knows the instant the party crosses the threshold. He always has.",
      dmNotes: "Do not run Ravenloft as a dungeon crawl. Run it as a house with an owner.",
    },
  },

  // --- Factions ------------------------------------------------------------------
  {
    kind: "faction",
    slug: "the-vistani",
    title: "The Vistani",
    summary: "Travellers who pass through the mists as though they were not there.",
    body: "They trade, they read fortunes, and they are the only people in Barovia who come and go.",
    visibility: "public",
    published: true,
    detail: {
      motto: "The cards know.",
      statedGoals: "Trade, travel, and the reading of fortunes.",
      trueGoals:
        "Most Vistani families are loyal to Strahd and report to him. Madam Eva's are not, quite.",
      secrets: "The mists let them pass because Strahd allows it, not because they are immune.",
    },
  },
  {
    kind: "faction",
    slug: "order-of-the-silver-dragon",
    title: "Order of the Silver Dragon",
    summary: "A knightly order, long destroyed.",
    body: "Argynvostholt stands burned and empty. The order's banner is still somewhere in the valley.",
    visibility: "player",
    published: true,
    detail: {
      motto: "Light against the long night.",
      statedGoals: "To hold the valley against the darkness.",
      trueGoals: "What remains of the order is undead and no longer remembers what it was for.",
      secrets: "Restoring the beacon at Argynvostholt weakens Strahd's hold on the mists.",
    },
  },

  // --- NPCs ----------------------------------------------------------------------
  {
    kind: "npc",
    slug: "strahd-von-zarovich",
    title: "Strahd von Zarovich",
    summary: "The Devil Strahd. Lord of Barovia.",
    body: "A gracious host. He will invite you to dinner, and it will be a real invitation.",
    visibility: "public",
    published: true,
    detail: {
      epithet: "The Devil Strahd",
      status: "undead",
      portraitUrl: null,
      trueAllegiance:
        "Himself, and the memory of Tatyana. Every alliance he offers is instrumental.",
      secrets:
        "He is bound to the valley as surely as anyone. The Dark Powers hold his leash, and he knows it.",
      statBlock: "AC 16, HP 144, CR 15. Legendary actions; regional effects across the valley.",
    },
  },
  {
    kind: "npc",
    slug: "ireena-kolyana",
    title: "Ireena Kolyana",
    summary: "The burgomaster's adopted daughter, in Barovia village.",
    body: "Practical, brave, and entirely aware that something is coming for her.",
    visibility: "player",
    published: true,
    detail: {
      epithet: "The Burgomaster's Daughter",
      status: "alive",
      portraitUrl: null,
      trueAllegiance: "Her own — but she is the reincarnation of Tatyana and does not know it.",
      secrets:
        "Strahd's entire interest in the party is downstream of their proximity to her. This is the spoiler the campaign lives or dies on.",
      statBlock: "Noble statblock; do not let her die to a random encounter.",
    },
  },
  {
    kind: "npc",
    slug: "izek-strazni",
    title: "Izek Strazni",
    summary: "The Baron's enforcer in Vallaki. His right arm is not his own.",
    body: "He collects taxes, breaks doors, and is feared in a town that pretends to be happy.",
    visibility: "player",
    published: true,
    detail: {
      epithet: "The Baron's Enforcer",
      status: "alive",
      portraitUrl: null,
      trueAllegiance:
        "Obsessed with Ireena. He has been carving her likeness into dolls for years.",
      secrets: "His fiend-arm was Baba Lysaga's doing. He does not remember the bargain.",
      statBlock: "AC 15, HP 91, CR 5. Fire bolt from the arm.",
    },
  },
  {
    kind: "npc",
    slug: "madam-eva",
    title: "Madam Eva",
    summary: "A Vistani seer at Tser Pool. She has been expecting you.",
    body: "She reads the Tarokka, and the reading is not decorative — it decides where things are.",
    visibility: "player",
    published: true,
    detail: {
      epithet: "The Seer of Tser Pool",
      status: "alive",
      portraitUrl: null,
      trueAllegiance: "Not Strahd's, whatever the other Vistani are.",
      secrets: "She is Strahd's half-sister, and far older than she appears.",
      statBlock: "Use the Vistani seer statblock; she should never be fought.",
    },
  },

  // --- Items ---------------------------------------------------------------------
  {
    kind: "item",
    slug: "holy-symbol-of-ravenkind",
    title: "Holy Symbol of Ravenkind",
    summary: "A crystal amulet on a silver chain.",
    body: "One of the three treasures the Tarokka reading places somewhere in the valley.",
    visibility: "player",
    published: true,
    detail: {
      rarity: "legendary",
      requiresAttunement: true,
      properties: "Turn undead at advantage; three charges of hold monster against vampires.",
      curse: null,
      secrets: "Its location is set by the card draw, not fixed. Re-read the spread before play.",
    },
  },
  {
    kind: "item",
    slug: "tome-of-strahd",
    title: "Tome of Strahd",
    summary: "A journal in Strahd's own hand.",
    body: "It is not a spellbook. It is an explanation, and it is worse for that.",
    visibility: "player",
    published: true,
    detail: {
      rarity: "very-rare",
      requiresAttunement: false,
      properties: "Reading it in full takes an hour and reveals Strahd's history and motives.",
      curse: null,
      secrets: "Give this to the party early. Strahd is more frightening once they understand him.",
    },
  },

  // --- Lore ----------------------------------------------------------------------
  {
    kind: "lore",
    slug: "the-mists",
    title: "The Mists",
    summary: "Everyone agrees the mists are why nobody leaves. Nobody agrees why.",
    body: "Common wisdom holds that the mists are a curse laid on the land, and that walking into them long enough returns you to where you started.",
    visibility: "public",
    published: true,
    detail: {
      category: "folklore",
      source: "Common knowledge in every village in the valley",
      isAccurate: true,
      secrets: "The mists are the Dark Powers' prison wall, and Strahd is the inmate.",
    },
  },
  {
    kind: "lore",
    slug: "the-tatyana-story",
    title: "The Story of Tatyana",
    summary: "A village tale about a bride who fell from the castle walls.",
    body: "They say a girl threw herself from Ravenloft's walls rather than marry its lord. They say it as a warning to daughters.",
    visibility: "player",
    published: true,
    detail: {
      category: "history",
      source: "Barovian village elders",
      isAccurate: true,
      secrets:
        "It is true, and she has been reborn in the valley many times since. Ireena is the current one.",
    },
  },
  {
    kind: "lore",
    slug: "the-dark-powers",
    title: "The Dark Powers",
    summary: "Something made this valley, and it was not Strahd.",
    body: "There is no common knowledge here. Barovians have no word for it.",
    visibility: "dm",
    published: true,
    detail: {
      category: "cosmology",
      source: "Nowhere in the valley",
      isAccurate: true,
      secrets:
        "They granted Strahd his power and made the valley his cell. Never explain them on screen.",
    },
  },

  // --- Session -------------------------------------------------------------------
  {
    kind: "session",
    slug: "session-01-into-the-mists",
    title: "Session 1 — Into the Mists",
    summary: "The party enters the valley and reaches Barovia village.",
    body: "Opened with the letter from Kolyan Indirovich. Ended at the gates of Barovia village.",
    visibility: "player",
    published: true,
    detail: {
      sessionNumber: 1,
      playedOn: null,
      recap: "You answered a letter begging for help. The letter was a lure, and the mists closed.",
      dmNotes: "They missed the Vistani camp entirely. Move Madam Eva's hook to session 2.",
    },
  },

  // --- Rule ----------------------------------------------------------------------
  {
    kind: "rule",
    slug: "gothic-horror-resolve",
    title: "Resolve",
    summary: "A homebrew track replacing long-rest healing in the valley.",
    body: "Barovia does not let you sleep it off. Resolve is spent to shake off fear and regained only at moments of genuine safety.",
    visibility: "player",
    published: true,
    detail: {
      replaces: "Long rest hit point recovery (PHB)",
      mechanics: "Each character has Resolve equal to their proficiency bonus.",
      dmGuidance: "Grant Resolve for narrative wins, never for combat. It is a pacing lever.",
    },
  },

  // --- Handout -------------------------------------------------------------------
  {
    kind: "handout",
    slug: "letter-from-kolyan-indirovich",
    title: "Letter from Kolyan Indirovich",
    summary: "The letter that brought the party into the valley.",
    body: "A plea for help from the burgomaster of Barovia village, promising rich reward.",
    visibility: "player",
    published: true,
    detail: {
      handoutType: "letter",
      assetUrl: null,
      revealedAt: null,
      secrets: "Written by Strahd. Kolyan was already dead when the party received it.",
    },
  },

  // --- A draft, to exercise the unpublished path ----------------------------------
  {
    kind: "npc",
    slug: "rahadin",
    title: "Rahadin",
    summary: "Strahd's chamberlain. Unfinished draft.",
    body: "Still being written.",
    visibility: "dm",
    published: false,
    detail: {
      epithet: "The Chamberlain",
      status: "alive",
      portraitUrl: null,
      trueAllegiance: "Strahd's, absolutely and without reservation.",
      secrets: "His Deathly Choir kills those who hear it. He has served since before the curse.",
      statBlock: "AC 16, HP 105, CR 10.",
    },
  },
];

/**
 * Edges between seeded entities, by slug.
 *
 * The visibility on each edge is the point of including these at all. The Ireena ->
 * Tatyana edge is `dm` while both of its endpoints are player-visible: the connection is
 * the secret, not the nodes. A filter that hid only entities would leak it.
 */
export const SEED_LINKS: readonly SeedLink[] = [
  {
    from: "vallaki",
    to: "barovia",
    relation: "located_in",
    note: null,
    visibility: "public",
  },
  {
    from: "castle-ravenloft",
    to: "barovia",
    relation: "located_in",
    note: null,
    visibility: "public",
  },
  {
    from: "izek-strazni",
    to: "vallaki",
    relation: "located_in",
    note: "Enforces the Baron's decrees.",
    visibility: "player",
  },
  {
    from: "strahd-von-zarovich",
    to: "castle-ravenloft",
    relation: "located_in",
    note: null,
    visibility: "public",
  },
  {
    from: "madam-eva",
    to: "the-vistani",
    relation: "member_of",
    note: null,
    visibility: "player",
  },
  {
    from: "strahd-von-zarovich",
    to: "ireena-kolyana",
    relation: "related_to",
    note: "He believes she is Tatyana returned.",
    visibility: "dm",
  },
  {
    from: "ireena-kolyana",
    to: "the-tatyana-story",
    relation: "related_to",
    note: "She is the subject of it and does not know.",
    visibility: "dm",
  },
  {
    from: "izek-strazni",
    to: "ireena-kolyana",
    relation: "related_to",
    note: "Obsession. He has been carving her likeness for years.",
    visibility: "dm",
  },
  {
    from: "madam-eva",
    to: "strahd-von-zarovich",
    relation: "related_to",
    note: "Half-sister.",
    visibility: "dm",
  },
  {
    from: "order-of-the-silver-dragon",
    to: "strahd-von-zarovich",
    relation: "opposes",
    note: null,
    visibility: "player",
  },
];
