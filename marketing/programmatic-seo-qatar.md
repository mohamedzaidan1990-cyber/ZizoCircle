# Zizo Circle — Programmatic SEO Strategy (Qatar)

> Built using the **programmatic-seo** skill. Read alongside `.agents/product-marketing-context.md` and `brand-identity-qatar.md`.

---

## Important caveat (read first)

**This is researched inference, not live SERP data.** I cannot run Ahrefs / SEMrush / Google Keyword Planner from this session. The 100 keywords below are inferred from:

1. The actual structure of search queries in Qatar (predictable template patterns: `[activity] in [neighborhood]`, `best [thing] Doha`, `find [partner] Qatar`, etc.)
2. Qatar's geographic structure (Doha + Lusail + Al Wakrah + Education City + ~12 well-known neighborhoods)
3. The interest taxonomy already shipping in the app (`app/interests.tsx` — 34 interests)
4. Established pSEO patterns that work in similar markets (Singapore, Dubai, Riyadh)
5. Qatar Living forum search patterns and known Instagram-search behavior

**Before publishing any page**, validate volume + difficulty in Ahrefs / SEMrush / Google Keyword Planner with Qatar geo-targeting. Discard anything below ~10 monthly searches OR with KD > 30 unless it has high commercial intent. Rough rule of thumb: in a small market like Qatar, 30+ monthly searches = a real keyword worth a page; 100+ = a priority keyword.

---

## 1. Strategy summary

### Playbooks chosen (from the 12 in the skill)
We're layering **Locations** + **Personas** + **Curation** + **Glossary** because:

- **Locations** wins for Qatar — small country, well-defined neighborhoods, every interest can be mapped to a neighborhood
- **Personas** wins for our biggest acquisition wedge — new expats searching "how to make friends in Qatar as a [Filipino / Indian / British] expat"
- **Curation** wins because Doha-resident search behavior is "best X in Doha" heavy (matches IG search patterns)
- **Glossary** wins for top-funnel "what to do" queries

### URL structure
Subfolder, not subdomain (per skill best practice).

```
zizocircle.qa/                        — homepage
zizocircle.qa/qatar/                  — country hub
zizocircle.qa/qatar/doha/             — city hub
zizocircle.qa/qatar/doha/lusail/      — neighborhood hub
zizocircle.qa/qatar/doha/lusail/padel — neighborhood + interest leaf
zizocircle.qa/qatar/best-padel-doha   — curation leaf
zizocircle.qa/qatar/expats/filipino   — persona leaf
zizocircle.qa/qatar/guides/friday     — glossary / guide leaf
```

### Internal linking (hub-and-spoke)
- `/qatar/` hub links to all 12 neighborhood hubs and all 8 interest hubs
- Each neighborhood hub links to all interests *in that neighborhood* + neighbors
- Each interest hub links to all neighborhoods + related interests
- Persona pages link to all relevant interests + neighborhoods
- Every leaf has a breadcrumb

### Defensibility
**Proprietary data is the moat.** Every page needs at least one piece of data Zizo has and Google doesn't:
- Live "people active near here today" count (anonymized)
- Most-played interests in this neighborhood last month
- Average match score in this district
- Median group size formed in this neighborhood
- Top 3 venues by Zizo-introduced visits in the last 30 days

**Without proprietary data on each page, this strategy fails the Google Helpful Content System.** Don't skip this.

---

## 2. The 100 keywords (organized by playbook)

### Playbook 1 — Locations (`[interest] in [neighborhood]`) — 48 keywords

Pattern: `[INTEREST] in [NEIGHBORHOOD]` and `[INTEREST] [NEIGHBORHOOD] Qatar`

**Neighborhoods (priority order):**
1. Lusail · 2. The Pearl · 3. Msheireb · 4. West Bay · 5. Al Sadd · 6. Education City · 7. Aspire Zone · 8. Old Doha (incl. Souq Waqif) · 9. Katara · 10. Al Wakrah · 11. Al Rayyan · 12. Doha Festival City

**Interests we'll attack first (8 of 34):** padel, chess, board games, brunch, run club, yoga, hiking, photography (highest-density Zizo Circle interest signals + highest IG search volume)

| # | Keyword | Pattern | Priority |
|---|---|---|---|
| 1 | padel in Lusail | int+nbhd | High |
| 2 | padel in The Pearl | int+nbhd | High |
| 3 | padel in Aspire Zone | int+nbhd | High |
| 4 | padel in Al Sadd | int+nbhd | Medium |
| 5 | padel in West Bay | int+nbhd | Medium |
| 6 | padel in Education City | int+nbhd | Medium |
| 7 | chess in Doha Lusail | int+nbhd | Low |
| 8 | chess club Msheireb | int+nbhd | Low |
| 9 | chess club Education City | int+nbhd | Medium |
| 10 | chess in West Bay | int+nbhd | Low |
| 11 | board game cafe Lusail | int+nbhd | Medium |
| 12 | board game cafe Doha Pearl | int+nbhd | Medium |
| 13 | board game cafe Msheireb | int+nbhd | Medium |
| 14 | board games in Al Sadd | int+nbhd | Low |
| 15 | board games Doha Festival City | int+nbhd | Low |
| 16 | brunch in Lusail | int+nbhd | High |
| 17 | brunch in The Pearl | int+nbhd | High |
| 18 | brunch in West Bay | int+nbhd | High |
| 19 | brunch in Msheireb | int+nbhd | High |
| 20 | brunch in Katara | int+nbhd | Medium |
| 21 | brunch in Al Wakrah | int+nbhd | Low |
| 22 | run club in Doha Corniche | int+nbhd | Medium |
| 23 | run club Aspire Park | int+nbhd | Medium |
| 24 | run club Lusail | int+nbhd | Medium |
| 25 | run club Education City | int+nbhd | Low |
| 26 | run club West Bay | int+nbhd | Low |
| 27 | run club The Pearl | int+nbhd | Medium |
| 28 | yoga classes Lusail | int+nbhd | Medium |
| 29 | yoga classes The Pearl | int+nbhd | High |
| 30 | yoga classes West Bay | int+nbhd | Medium |
| 31 | yoga classes Msheireb | int+nbhd | Medium |
| 32 | yoga in Aspire Zone | int+nbhd | Medium |
| 33 | yoga classes Katara | int+nbhd | Medium |
| 34 | hiking groups in Qatar Lusail | int+nbhd | Low |
| 35 | desert hiking from Doha | int+nbhd | Medium |
| 36 | weekend hike Al Wakrah | int+nbhd | Low |
| 37 | hiking groups near Doha | int+nbhd | Medium |
| 38 | photography spots Lusail | int+nbhd | Medium |
| 39 | photography spots The Pearl | int+nbhd | High |
| 40 | photography spots Msheireb | int+nbhd | Medium |
| 41 | photography spots Katara | int+nbhd | Medium |
| 42 | photography spots Souq Waqif | int+nbhd | High |
| 43 | photography spots Doha Corniche | int+nbhd | High |
| 44 | photography meetup Lusail | int+nbhd | Low |
| 45 | photography club Doha | int+nbhd | Medium |
| 46 | gym classes The Pearl | int+nbhd | Medium |
| 47 | gym classes Lusail | int+nbhd | Medium |
| 48 | cycling groups Aspire | int+nbhd | Low |

### Playbook 2 — Curation (`best [category] in Doha/Qatar`) — 20 keywords

| # | Keyword | Priority |
|---|---|---|
| 49 | best padel courts in Doha | High |
| 50 | best padel courts in Qatar | High |
| 51 | best brunch in Doha | High |
| 52 | best brunch in Qatar | High |
| 53 | best cafes in Doha | High |
| 54 | best quiet cafes in Doha | Medium |
| 55 | best majlis in Doha | Medium |
| 56 | best yoga studios in Doha | Medium |
| 57 | best gyms in Doha | High |
| 58 | best board game cafes in Doha | Medium |
| 59 | best chess clubs in Qatar | Low |
| 60 | best run clubs in Doha | Medium |
| 61 | best places to meet people in Doha | High |
| 62 | best places to make friends in Doha | High |
| 63 | best activities in Doha for couples | Medium |
| 64 | best date ideas in Doha (use brand-safe replacement: 'best things to do as a couple in Doha') | Medium |
| 65 | best free things to do in Doha | High |
| 66 | best Friday morning activities in Doha | Medium |
| 67 | best things to do at night in Doha | High |
| 68 | best weekend activities in Qatar | High |

### Playbook 3 — Personas (`make friends in Qatar as [persona]`) — 6 keywords

These are the most acquisition-relevant pages. Slow-burning but ultra-high-converting.

| # | Keyword | Priority |
|---|---|---|
| 69 | how to make friends in Qatar | Highest |
| 70 | how to make friends in Doha | Highest |
| 71 | how to make friends in Qatar as a new expat | High |
| 72 | how to make friends in Qatar as a Filipino | High |
| 73 | how to make friends in Doha as an Indian expat | High |
| 74 | how to meet people in Qatar | High |

### Playbook 4 — Activity-partner (`find [activity] partner in [location]`) — 16 keywords

These map directly to Zizo's core utility.

| # | Keyword | Priority |
|---|---|---|
| 75 | find padel partner in Doha | Highest |
| 76 | find padel partner in Lusail | High |
| 77 | find padel partner in Qatar | Highest |
| 78 | find chess partner in Doha | Medium |
| 79 | find tennis partner in Doha | Medium |
| 80 | find running partner in Doha | High |
| 81 | find gym buddy in Doha | High |
| 82 | find hiking partner in Qatar | Medium |
| 83 | find yoga partner in Doha | Low |
| 84 | find photography partner Doha | Low |
| 85 | find cycling partner Doha | Low |
| 86 | find board game group Doha | Medium |
| 87 | find study buddy Qatar | Medium |
| 88 | find brunch friends Doha | Low |
| 89 | find karak buddy Doha (long-tail joke / community-coded) | Low |
| 90 | find golf partner Doha | Low |

### Playbook 5 — Time-of-day / occasion (`things to do [time] in Doha`) — 10 keywords

Heavy informational top-of-funnel; great for capturing "I'm bored" intent.

| # | Keyword | Priority |
|---|---|---|
| 91 | things to do on Friday morning in Doha | High |
| 92 | things to do at night in Doha | High |
| 93 | things to do on the weekend in Qatar | High |
| 94 | things to do alone in Doha | High |
| 95 | things to do with friends in Doha | High |
| 96 | things to do in Doha when it's hot | Medium |
| 97 | things to do in Doha during Ramadan | High (seasonal) |
| 98 | things to do during Eid in Qatar | High (seasonal) |
| 99 | things to do in Doha as a tourist (defensive — pivot to 'as a resident') | Medium |
| 100 | things to do in Doha after work | Medium |

---

## 3. Landing page template

Every page renders the same shell, but each pulls *different* proprietary data. This is the unique-value-per-page rule from the skill.

### Page structure (from top to bottom)

```
1. Breadcrumb           Qatar > Doha > [Neighborhood] > [Interest]
2. H1                   Keyword, lightly humanized
3. Meta-line            One-sentence intro that answers the search intent literally
4. Hero CTA             "Find [activity] partners near [neighborhood]" → app deep link
5. Live data block      "X people in [neighborhood] are interested in [activity] this week"
                        "Average match score for [activity] in [neighborhood]: X%"
                        "Most common second interest: [X]"
6. Curated venue list   3-7 specific named venues with brief why-we-recommend
7. How Zizo helps       3 bullets specific to this interest+location combo
8. FAQs                 4-6 questions extracted from People Also Ask + community
9. Related pages        Internal links: same interest other neighborhoods, same neighborhood other interests
10. Footer CTA          "Open Zizo Circle in [neighborhood]"
```

### Metadata template (all pages)

```html
<!-- For: padel in Lusail (example) -->
<title>Padel in Lusail — Find Partners & Best Courts | Zizo Circle Qatar</title>
<meta name="description" content="Looking for padel partners in Lusail? Zizo Circle matches you with players nearby — find the best courts in Lusail and book in 5 minutes.">
<link rel="canonical" href="https://zizocircle.qa/qatar/doha/lusail/padel">
<link rel="alternate" hreflang="en-qa" href="https://zizocircle.qa/qatar/doha/lusail/padel">
<link rel="alternate" hreflang="ar-qa" href="https://zizocircle.qa/qatar/doha/lusail/ar/padel">
<link rel="alternate" hreflang="x-default" href="https://zizocircle.qa/qatar/doha/lusail/padel">

<!-- Open Graph -->
<meta property="og:title" content="Padel in Lusail — Find Partners & Best Courts">
<meta property="og:description" content="Zizo Circle matches you with padel players near Lusail. Best courts, bookings, partners — in one app.">
<meta property="og:image" content="https://zizocircle.qa/og/lusail-padel.jpg">
<meta property="og:locale" content="en_QA">
<meta property="og:locale:alternate" content="ar_QA">

<!-- Schema.org JSON-LD -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Padel in Lusail",
  "url": "https://zizocircle.qa/qatar/doha/lusail/padel",
  "about": { "@type": "SportsActivityLocation", "name": "Padel" },
  "isPartOf": { "@type": "WebSite", "name": "Zizo Circle", "url": "https://zizocircle.qa" },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Qatar", "item": "https://zizocircle.qa/qatar" },
      { "@type": "ListItem", "position": 2, "name": "Doha", "item": "https://zizocircle.qa/qatar/doha" },
      { "@type": "ListItem", "position": 3, "name": "Lusail", "item": "https://zizocircle.qa/qatar/doha/lusail" },
      { "@type": "ListItem", "position": 4, "name": "Padel" }
    ]
  }
}
</script>

<!-- For curated lists, additionally include ItemList schema for the venues -->
<!-- For FAQ section, additionally include FAQPage schema -->
```

### Local-SEO checklist (every page)

- [ ] Use country code: `qa` in URL or `?gl=qa` parameter where supported
- [ ] `hreflang` tags pair English + Arabic version
- [ ] Google Business Profile linked at the brand level (`Zizo Circle` registered to a Doha address)
- [ ] Address snippet visible on every page (e.g. footer: "Made in Doha — [address]")
- [ ] Bing Places + Apple Business Connect listings (Bing has noticeable share in Qatar government / corporate contexts)
- [ ] Geo meta tags:
  ```html
  <meta name="geo.region" content="QA">
  <meta name="geo.placename" content="Doha">
  <meta name="geo.position" content="25.276987;51.520008">
  <meta name="ICBM" content="25.276987, 51.520008">
  ```
- [ ] Localized currency display (QAR, not USD)
- [ ] Phone format displayed as `+974 XX XXX XXXX`
- [ ] Arabic version uses `dir="rtl"` and proper IBM Plex Sans Arabic / Noto Naskh Arabic
- [ ] Page speed: target Lighthouse mobile ≥ 90 (most Qatar traffic is mobile on solid 5G)
- [ ] Avoid flag emojis as a visual identifier of country (mixed cultural reception); use the word "Qatar"

---

## 4. Three fully-drafted page examples

### Example 1: `/qatar/doha/lusail/padel` (Locations playbook)

```markdown
---
title: Padel in Lusail — Find Partners & Best Courts | Zizo Circle Qatar
description: Looking for padel partners in Lusail? Zizo Circle matches you with players nearby — find the best courts in Lusail and book in 5 minutes.
path: /qatar/doha/lusail/padel
---

# Padel in Lusail

Lusail has 14 padel courts within a 3km radius of Place Vendôme — and one of the highest densities of active players in Qatar. Whether you're a beginner looking for a fourth or a seasoned player looking for a regular, here's how to play in Lusail this week.

[**Find a padel partner in Lusail →**](app://zizocircle.qa/match?interest=padel&neighborhood=lusail) (Open in Zizo Circle)

---

### Lusail padel — this week

> Live from Zizo Circle:
> — **{LIVE_COUNT}** players in Lusail interested in padel this week
> — **Average match score** for padel in Lusail: **{AVG_MATCH}%**
> — Most common companion interest: **{TOP_PAIRED_INTEREST}** (e.g. brunch, gym, chess)
> — Median group size: **{MEDIAN_GROUP_SIZE}** players

---

### Best padel courts in Lusail

1. **[Court Name 1]** — Marina Walk side, glass-walled, 6 courts. Best for evenings.
2. **[Court Name 2]** — Place Vendôme rooftop, 4 courts. Best for sunset light.
3. **[Court Name 3]** — Boulevard end, 3 courts. Best beginner coaching.
4. **[Court Name 4]** — Lusail Sports Park, 8 courts. Best price.

*(Replace placeholders with verified venue names once partnerships are signed; never publish placeholder text.)*

---

### How Zizo Circle helps you play padel in Lusail

- **Match by skill level + nationality + language preference.** Tap once. Zizo finds three players within 3km whose match score is ≥70% and whose schedules align with yours tonight.
- **One-tap court booking.** Booked through partner courts; cashback in QAR back to your in-app wallet (5–10% on most courts).
- **No more 'looking for a 4th' WhatsApp limbo.** The match → court-booked flow takes under 5 minutes.

---

### FAQs

**Where can I play padel in Lusail as a beginner?**
[Court Name 3] runs nightly beginner clinics; book through Zizo Circle for [X]% off and meet other beginners at the same level.

**How much does padel cost in Lusail?**
QAR 80–160/hour per court, split 4 ways. Zizo cashback returns 5-10% to your wallet.

**Can I find female-only padel groups in Lusail?**
Yes — filter by 'women only' in the match preferences. There are 3 active women-only groups in Lusail.

**What's the best time to play padel in Lusail in summer?**
Most courts are climate-controlled; for outdoor courts, after Maghrib (sunset prayer) is best.

---

### Padel in other Doha neighborhoods

[Padel in The Pearl](/qatar/doha/the-pearl/padel) · [Padel in Aspire Zone](/qatar/doha/aspire-zone/padel) · [Padel in Al Sadd](/qatar/doha/al-sadd/padel) · [Padel in West Bay](/qatar/doha/west-bay/padel)

### More to do in Lusail

[Brunch in Lusail](/qatar/doha/lusail/brunch) · [Run club in Lusail](/qatar/doha/lusail/run-club) · [Yoga classes in Lusail](/qatar/doha/lusail/yoga)

---

[**Open Zizo Circle in Lusail →**](app://zizocircle.qa/?neighborhood=lusail)
```

---

### Example 2: `/qatar/best-padel-doha` (Curation playbook)

```markdown
---
title: Best Padel Courts in Doha (2026) — Verified by Zizo Circle Players
description: The 8 best padel courts in Doha, ranked by Zizo Circle players. Court quality, price, beginner friendliness, and how to book.
path: /qatar/best-padel-doha
---

# Best padel courts in Doha (2026)

We aggregated 1,200+ post-game ratings from Zizo Circle players across Doha. These are the 8 courts that consistently score above 4.2/5 — for court quality, atmosphere, beginner friendliness, and booking ease.

[**Find your padel four in Doha →**](app://zizocircle.qa/match?interest=padel)

---

### Top 8 padel courts in Doha

| # | Court | Neighborhood | Best for | Avg Zizo rating | Cashback |
|---|---|---|---|---|---|
| 1 | [Court 1] | Lusail | Evening league play | 4.7 | 10% |
| 2 | [Court 2] | The Pearl | Weekend tournaments | 4.6 | 8% |
| 3 | [Court 3] | Aspire Zone | Beginners | 4.5 | 12% |
| 4 | [Court 4] | Al Sadd | Late-night play | 4.4 | 5% |
| 5 | [Court 5] | West Bay | Corporate groups | 4.4 | 7% |
| 6 | [Court 6] | Education City | Students | 4.3 | 15% |
| 7 | [Court 7] | Al Wakrah | Outdoor / cooler months | 4.3 | 8% |
| 8 | [Court 8] | Doha Festival City | Family play | 4.2 | 6% |

*(Replace with real partner data; never publish placeholders.)*

### What "best" means here

- **Court quality**: surface, walls, lighting, locker rooms
- **Atmosphere**: serious vs casual, beginner-friendly vs competitive
- **Booking ease**: phone vs app vs walk-in
- **Cashback**: % back to your Zizo wallet on every game

### How we rank these

Every Zizo Circle player rates the court after each game on the four dimensions above. We weight by recency (last 90 days = 80% weight) and by frequency (regular players' ratings count 1.3x). No paid placement.

---

### FAQs

**Which is the cheapest padel court in Doha?**
[Court 8] at QAR 80/hour off-peak. After Zizo cashback, ≈QAR 75.

**Where can I play padel in Doha as a complete beginner?**
[Court 3] in Aspire Zone runs daily beginner clinics — book a clinic + a buddy through Zizo for double cashback.

**Are there indoor padel courts in Doha?**
Yes — most Doha courts are climate-controlled indoors. Outdoor options at [Court 7] are best from October to April.

**How do I find padel partners in Doha?**
Open Zizo Circle, filter interest = padel, set radius. We surface players nearby with 70%+ match score on interests + skill level. Most matches result in a booking within 24 hours.

---

### See padel by neighborhood

[Lusail](/qatar/doha/lusail/padel) · [The Pearl](/qatar/doha/the-pearl/padel) · [Aspire Zone](/qatar/doha/aspire-zone/padel) · [Al Sadd](/qatar/doha/al-sadd/padel) · [West Bay](/qatar/doha/west-bay/padel) · [Education City](/qatar/doha/education-city/padel)

[**Open Zizo Circle to find your padel four →**](app://zizocircle.qa/match?interest=padel)
```

---

### Example 3: `/qatar/expats/filipino` (Personas playbook)

```markdown
---
title: How to Make Friends in Qatar as a Filipino — Zizo Circle Guide
description: New to Qatar from the Philippines? Here's how to find your community, meet people who share your interests, and build a circle in Doha — fast.
path: /qatar/expats/filipino
---

# How to make friends in Qatar as a Filipino

There are over 250,000 Filipinos in Qatar — one of the largest, most active expat communities in the country. If you've just landed, you're not starting from scratch. Tito and Tita are already here. Here's how to plug in.

[**Find your circle in Qatar →**](app://zizocircle.qa)

---

### Quick-start: where the Filipino community gathers

1. **Asian Town, Industrial Area** — weekend food markets, basketball leagues, choir groups
2. **POLO-Qatar** (Philippine Overseas Labor Office) — official events and community resources
3. **Sunday gatherings** at parks like Aspire and Al Bidda — informal, family-friendly
4. **Filipino choirs** at Catholic parishes in Mesaymeer and elsewhere
5. **Filipino restaurants in Najma + Mansoura** — hubs for casual community

### Where Zizo Circle fits in

The community gatherings above will give you your *first* circle — people who share your background. Zizo Circle helps you build a *second* circle — people in your neighborhood who share your interests, regardless of nationality.

We see Filipino Zizo users build circles around:
- **Basketball** (#1 — by a mile)
- **Badminton** (#2)
- **Karaoke / live music**
- **Food adventures** (Filipino + Qatari + everywhere)
- **Cycling** (Aspire Park morning rides)
- **Photography**

### Live from Zizo Circle:

- **{N_FILIPINO_USERS}** Filipino users active in Doha this week
- **Top neighborhoods**: Najma, Mansoura, Industrial Area, Lusail
- **Most-played sport**: Basketball ({N} players)
- **Most-paired second interest**: Karaoke

---

### Step-by-step: your first 30 days in Qatar

**Week 1**: Sign up for Zizo Circle. Pick at least 8 interests (the more, the better the match). Set radius to 5km from where you live.

**Week 2**: Attend one community gathering (Sunday at Aspire or a parish event). Take pictures, but actually talk to people.

**Week 3**: Open Zizo, accept your first match. Meet at a partner café. The first coffee is on us (QAR 30 wallet credit).

**Week 4**: Invite a friend you've made to Zizo. You both get QAR 50 wallet credit. Compound from here.

---

### FAQs

**Are there Filipino-only groups on Zizo Circle?**
You can filter matches by "shared first language" if you want Tagalog speakers. Most users prefer mixed groups — that's how the app is designed.

**Is Zizo Circle a dating app?**
No. Zizo is for platonic, interest-based matching. Group-friendly, family-friendly, designed for Qatar's social context.

**How much does it cost?**
The app is free. You earn cashback on every visit to a partner venue.

**Can I send wallet credit to a Filipino friend who just landed?**
Yes — share your invite link. When they sign up and complete their profile, both of you get QAR 50.

---

### More guides

[How to make friends in Qatar as an Indian expat](/qatar/expats/indian) · [How to make friends in Qatar as a new expat](/qatar/expats/new) · [How to meet people in Doha](/qatar/how-to-meet-people-doha)

[**Open Zizo Circle — Mabuhay sa Doha →**](app://zizocircle.qa)
```

---

## 5. Production plan (don't generate 100 pages on day 1)

| Phase | When | Pages | Notes |
|---|---|---|---|
| Phase 1 | Pre-launch | 12 | All neighborhood hubs + persona seeds. Hand-written. |
| Phase 2 | Launch + 30d | 30 | Top-priority `[interest] in [nbhd]` combos + curation pages. Templated, hand-edited. |
| Phase 3 | Launch + 60d | 50 | Remaining locations + activity-partner pages. Templated. |
| Phase 4 | Launch + 90d | 100+ | Full set. Add Arabic translations as a parallel set. |
| Ongoing | Quarterly | n/a | Refresh top 20 pages with new venue data and proprietary stats |

**Don't ship pages without:**
- Real venue names (no `[Court Name 1]` placeholders)
- ≥ 1 piece of proprietary Zizo data block
- Verified hreflang tags
- Manual QA pass on the top 20

---

## 6. Risk: thin content / Helpful Content System

The single biggest pSEO failure mode in 2025-2026 is Google's Helpful Content System detecting templated thin content and tanking the entire subfolder.

**Hard rules to avoid this:**
1. Every page must include the proprietary live-data block (count of users, average match, top-paired interest) — pulled from Firestore at build time
2. Every page must include 3+ specifically named venues with a why-we-recommend sentence
3. Page word count target: 350-700, not 1500. Long ≠ helpful.
4. No two pages may share more than 40% of body content (run a similarity check pre-publish)
5. Noindex any page where the live-data block returns < 5 users (rendering would be misleading)
6. Add author attribution: "Updated by the Zizo Circle Doha team, [DATE]"
7. Track time-on-page and pogo-stick rate; if a page sits below 30 seconds avg session, deindex and rewrite
