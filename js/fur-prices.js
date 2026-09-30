/* Opossum Foot — fur price reference data (Q31).
   KBB MODEL: these are dated auction averages, a reference baseline like
   Kelley Blue Book — never an offer, never a live price, never a promise of
   what a buyer will pay.
   PROVENANCE RULE: figures come from published auction-house results ONLY.
   Never user-submitted, never crowdsourced (user-reported prices are gameable).
   PORTING: to reuse in the nuisance app's fur-buyer tab, copy the object
   assigned below (everything inside the braces) — it is plain JSON-compatible
   data with no app dependencies. Keep the source block intact so the numbers
   stay dated and sourced wherever they travel.
   Loaded via <script> so the app works from file:// with no fetch/CORS issues.
   Refresh: a monthly check stages new published sale figures for Tanner's
   review; new numbers never ship without his approval. */
window.OPOSSUM_FOOT_FUR_PRICES = {
  "schema": "opossum-foot-fur-prices/1",
  "source": {
    "sale": "Fur Harvesters Auction — March 2026 sale",
    "sale_dates": "2026-03-19 to 2026-03-21",
    "house": "Fur Harvesters Auction Inc., North Bay, Ontario",
    "published_by": "Government of the Northwest Territories, Dept. of Environment and Climate Change",
    "published_url": "https://www.gov.nt.ca/ecc/en/fur-harvesters-auction-march-results-2026",
    "region_note": "Northern pelts (NWT). Northern fur typically commands a premium — southern and central US pelts often trade lower.",
    "retrieved": "2026-09-29"
  },
  "entries": [
    {
      "species": "Beaver",
      "app_names": ["American beaver", "American beaver (closed areas)", "American beaver (closure areas)", "Beaver"],
      "avg_usd": 39.52, "high_usd": 68.85, "pelts_sold": 222,
      "spread_note": "Prime, extra-large sheared pelts topped at $68.85; smaller and lower-grade lots brought far less."
    },
    {
      "species": "Mink",
      "app_names": ["American mink", "Mink"],
      "avg_usd": 64.16, "high_usd": 78.30, "pelts_sold": 118,
      "spread_note": "Wild mink in strong demand at this sale; prices vary sharply by size and quality."
    },
    {
      "species": "Sable (American marten)",
      "app_names": ["American marten", "American marten (Kuiu Island)", "American marten (closed areas)", "Marten", "Pacific marten", "Pine marten"],
      "avg_usd": 296.11, "high_usd": 418.50, "pelts_sold": 1597,
      "spread_note": "Record sale for marten. These are prime northern pelts — southern marten trade lower."
    },
    {
      "species": "Otter",
      "app_names": ["North American river otter", "North American river otter (closure areas)", "River otter", "River otter (closed counties)"],
      "avg_usd": 71.55, "high_usd": 78.30, "pelts_sold": 2,
      "spread_note": "Only 2 pelts sold — a thin lot. Treat this average with extra caution."
    },
    {
      "species": "Fisher",
      "app_names": ["Fisher", "Fisher (closed FMUs)"],
      "avg_usd": 104.13, "high_usd": 189.00, "pelts_sold": 13,
      "spread_note": "Small lot (13 sold); individual pelt quality moved the average."
    },
    {
      "species": "Lynx",
      "app_names": ["Canada lynx", "Lynx"],
      "avg_usd": 492.03, "high_usd": 756.00, "pelts_sold": 84,
      "spread_note": "Luxury-predator demand drove this sale (2025 average was $195). Top lot $756."
    },
    {
      "species": "Muskrat",
      "app_names": ["Muskrat", "Round-tailed muskrat"],
      "avg_usd": 2.60, "high_usd": 12.49, "pelts_sold": 1225,
      "spread_note": "Bulk utility fur — the average moves little; volume matters more than grade."
    },
    {
      "species": "Red fox",
      "app_names": ["Red fox", "Cascade red fox", "Red fox (includes all color phases found in Idaho)", "Red fox (including cross, black, and silver color phases)"],
      "avg_usd": 41.59, "high_usd": 86.40, "pelts_sold": 28,
      "spread_note": "Top lot $86.40; nearly double the 2025 average."
    },
    {
      "species": "Wolf",
      "app_names": ["Gray (timber) wolf", "Gray wolf", "Gray wolf (Deckard Flats to Trail Creek closure area)", "Gray wolf (inside Wolf Trophy Game Management Area)", "Gray wolf (outside Wolf Trophy Game Management Area)", "Gray wolf (public land, Units 48-49)"],
      "avg_usd": 395.17, "high_usd": 810.00, "pelts_sold": 57,
      "spread_note": "Top lot $810; taxidermy-grade specimens bring far more than the average."
    },
    {
      "species": "Wolverine",
      "app_names": ["Wolverine", "Wolverine (Unit 10)"],
      "avg_usd": 787.45, "high_usd": 1377.00, "pelts_sold": 41,
      "spread_note": "Top lot $1,377; taxidermy-skinned pelts set records at this sale."
    },
    {
      "species": "Ermine",
      "app_names": ["Short-tailed weasel (ermine)"],
      "avg_usd": 16.39, "high_usd": 24.30, "pelts_sold": 109,
      "spread_note": "Small specialty article; prices vary by whiteness and primeness."
    }
  ],
  "omitted": [
    { "species": "Coyote", "reason": "FHA March 2026 sold a single pelt ($13.50) — not a meaningful average." },
    { "species": "Raccoon", "reason": "No published FHA March 2026 figures; omitted rather than guessed." },
    { "species": "Bobcat", "reason": "No published FHA March 2026 figures; omitted rather than guessed." },
    { "species": "Opossum", "reason": "No published FHA March 2026 figures; omitted rather than guessed." },
    { "species": "Skunk", "reason": "No published FHA March 2026 figures; omitted rather than guessed." },
    { "species": "Badger", "reason": "No published FHA March 2026 figures; omitted rather than guessed." },
    { "species": "Gray fox", "reason": "No published FHA March 2026 figures; omitted rather than guessed." },
    { "species": "Cross/White/Silver fox", "reason": "FHA reported these color phases but the app has no matching species entries; folded into Red fox where the app combines color phases." },
    { "species": "Squirrel", "reason": "FHA 'Squirrel' average ($3.34) is too ambiguous across the app's squirrel variants; omitted rather than mislabeled." },
    { "species": "Grizzly bear", "reason": "FHA reported grizzly ($2,452.50 avg) but the app has no grizzly species entry." },
    { "species": "Black bear", "reason": "None offered at the FHA March 2026 sale." }
  ]
};
