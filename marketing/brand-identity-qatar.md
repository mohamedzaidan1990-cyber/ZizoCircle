# Zizo Circle — Brand Identity (Qatar)

> Companion to `.agents/product-marketing-context.md`. Use this as the single source of truth when writing copy, designing visuals, briefing partners, or producing ads for the Qatar market.

---

## 1. Brand essence

**One-line:** Qatar's social circle app — meet people who love what you love, get rewarded every time you go out.

**One-paragraph:** Zizo Circle is the app that turns Doha's transient, social-but-scattered city life into a circle that fits you. Tell us what you're into; our AI finds the people nearby who share your interests; we suggest where to meet; and every visit puts cashback back in your wallet. Built in Qatar, for everyone in Qatar.

**Brand promise:** Within 30 days of joining, you will have met at least one person here you'd actually keep texting.

---

## 2. Brand archetype

**Primary: The Companion (modernized "Friend" archetype).** Not the hero. Not the magician. Zizo is the trusted local friend you wish you had on your first month in Doha — the one who knows the good padel courts, the quiet brunch spot, and the people who'd actually click with you.

**Secondary tint: The Insider.** Knows what's actually happening in the city this week, not what's trending on a generic Instagram feed.

What this archetype rejects:
- Hero archetype (we're not "saving" anyone)
- Lover archetype (this is not a dating brand)
- Magician archetype (no "magic algorithm" mystique — be matter-of-fact about how matching works)

---

## 3. Voice & tone

### Voice attributes (consistent)
1. **Warm** — addresses the reader directly, never lectures
2. **Specific** — names places, neighborhoods, and activities, never generic
3. **Multilingual-aware** — English-primary, naturally laces in `yalla` / `inshallah` / `habibi` only where it'd actually be said in real life
4. **Low-key confident** — states facts, doesn't oversell ("AI matches" not "magical AI" / "revolutionary AI")
5. **Generous** — spotlights venues, partners, and users; never makes itself the hero

### Tone (varies by context)

| Context | Tone | Example |
|---|---|---|
| Onboarding | Reassuring, friendly | "We'll send a code. Never shown to other users." |
| Match suggestion | Confident, specific | "94% match — you both love padel and Sunday brunch." |
| Cashback notification | Pleasantly surprising | "+QAR 14 added. Enjoy your coffee." |
| Empty state | Warm, encouraging | "Quiet right now. Here's three venues that fit your mood." |
| Errors | Calm, fix-it-fast | "Couldn't reach our servers. Tap to retry." |
| Push notifications | Useful, never needy | "Sara just joined a chess group at Msheireb tonight. 3 spots left." |

### Voice swatch — same idea, three tones

**Too cold:** "Use Zizo Circle to identify socially compatible individuals via AI."
**Too hot:** "OMG bestie, Zizo's gonna find you the SOULMATE friends of your DREAMS in Doha 💕✨"
**Just right:** "New in Doha? Zizo finds the people near you who love what you love — and gives you cashback when you meet up."

### Forbidden words & phrases
- ❌ "soulmate," "match made in heaven," any romantic-coded phrasing
- ❌ "Arabian nights," "desert magic," "exotic," "oasis" (orientalist tropes)
- ❌ "Disrupt," "revolutionize," "10x," "game-changer" (generic SaaS-isms)
- ❌ Any reference to alcohol, bars, clubs, nightlife in the Western sense
- ❌ "Hookup," "DTF," "swipe right" (dating-app language)
- ❌ "Foreigners," "locals" used as exclusionary categories — say "expats" only when neutral; prefer "people in Qatar"

### Approved Arabic / dialect insertions (use sparingly, max once per piece of copy)
- `yalla` — let's go (universal Levantine/Khaleeji)
- `inshallah` — God willing (use with care; in a casual booking flow it can read as evasive — avoid in CTAs)
- `habibi` / `habibti` — friend/dear (warm, gendered; safer in social posts than transactional copy)
- `khalas` — done / enough (use only in playful contexts)

---

## 4. Visual identity

### Color tokens (lifted from app code, source: `app/welcome.tsx`, `app/zizo-intro.tsx`)

| Role | Token | Hex | Usage |
|---|---|---|---|
| Primary | Zizo Purple | `#7B5CF6` | Main CTAs, brand mark |
| Secondary | Hot Pink | `#F53B8F` | Accents, hearts, "spark" moments |
| Accent A | Teal Mint | `#3BF5C8` | "Live" / "online" indicators |
| Accent B | Match Lime | `#C8F53B` | Match-percentage badges only |
| Accent C | Sun Orange | `#F5A53B` | Cashback / wallet moments |
| Background | Night Plum | `#0B0914` | App + marketing dark mode |
| Surface | Card Plum | `#181428` | Cards, modals |
| Border | Edge Plum | `#231E3A` | Dividers, outlines |
| Text high | Moonlight | `#F0EEF8` | Headlines, body on dark |
| Text muted | Dust Lilac | `#7A7595` | Subtitles, hints |

**Light-mode equivalents (for marketing site / press kit, since the app is dark-only):**
- BG: `#FAF8FF`, Surface: `#FFFFFF`, Border: `#E8E3F5`, Text: `#1A1530`, Muted: `#6A6480`. Primary purple stays.

### Typography
- **Display:** geometric sans, weight 800 (current app uses system; recommend `Inter` 800 for marketing site, `IBM Plex Sans Arabic` 700 for Arabic versions)
- **Body:** same family at 400/600
- **Numbers/badges:** tabular figures, weight 700 (e.g. "94% match")

### Logo & mascot
- **Logo:** Lowercase wordmark "zizo circle" in Inter 800, with an open circle replacing the dot of the "i" in "circle" — symbolizing an open social circle anyone can step into
- **Mascot:** **Zizo** — purple-skinned, big-eyed, friendly AI character (already designed in `app/zizo-intro.tsx`). Use in:
  - Onboarding screens ✅ (already there)
  - Tutorial videos
  - Cashback success screens
  - Push notification icons
  - Customer support replies (sign-off: "— Zizo & the team")
  - **Don't** use Zizo in serious / legal / safety / press communications

### Photography direction
- **Real Doha, real people.** Skyline shots only as accents — focus on faces, hands, food, the act of meeting.
- **Locations to feature:** Msheireb Downtown, Souq Waqif at golden hour, Lusail Boulevard, Katara Cultural Village, Pearl-Qatar Marina, Aspire Park, Education City, Old Doha Port, Place Vendôme.
- **Cast:** Reflect the actual demographic mix of Qatar — South Asian, Filipino, Egyptian, Levantine, East African, European, and Qatari nationals together. Modest dress throughout. Mixed-gender groups OK in casual settings (cafés, padel, board games); avoid 1:1 male-female framing.
- **Forbidden:** Stock photos. Camel imagery used decoratively. Falconry as visual shorthand. Sunset-on-the-dunes generic GCC clichés.

### Image-prompt template (for Flux / Midjourney / Imagen)
> Editorial photo, [location in Doha], [time of day], [3-4 people of mixed Qatar demographics] [activity], shot on 35mm, natural light, warm color grade, no logos visible, modest dress, candid expressions, depth of field, photorealistic, 9:16

---

## 5. Messaging hierarchy

### Tagline (primary)
**"Your circle, in Qatar."**

Alternates (for A/B / channel variation):
- "Doha is full of your people. We just help you find them."
- "Meet people who love what you love. Get cashback every time you do."
- "Qatar's social circle app."

### Value-prop ladder

| Layer | Message |
|---|---|
| **Hook** (3-second read) | Meet people in Qatar who love what you love. |
| **Promise** (10-second read) | Tell us what you're into — Zizo finds people nearby with 70%+ matching interests, suggests where to meet, and gives you cashback every time you go out. |
| **Proof** (30-second read) | Built for Qatar, in Qatar. AI-matched on real interests (not just looks). Curated venues across Doha, Lusail, Al Wakrah. Cashback in QAR straight to your wallet. Phone-verified. Designed for groups. |

### Audience-specific value props

| Audience | Lead message |
|---|---|
| New expats (0–6 months in Qatar) | "Your first 30 days in Doha shouldn't be lonely. Find your circle." |
| Long-term expats (1–4 yrs, friend group thinning) | "When your friends leave Doha, your circle doesn't have to." |
| Young Qatari nationals | "Meet people in Qatar who actually share what you're into — beyond your usual majlis." |
| Hobbyists (padel, chess, board games) | "Need a fourth for padel tonight? Zizo finds them in 5 minutes." |
| Couples | "Find other couples in Doha who do what you do." |

---

## 6. Brand do's and don'ts (one-pager for partners)

### Do
- Lead with the user's interest, not the app
- Name specific venues, neighborhoods, activities
- Show real demographic mix
- Quantify ("94% match," "+QAR 14 cashback") — Zizo is matter-of-fact about numbers
- Respect prayer times in scheduling, push timing, ad placements
- Plan around Ramadan, Eids, National Day, National Sports Day

### Don't
- Use dating-app language or imagery
- Reference alcohol, nightlife in the Western sense
- Use orientalist visuals or copy
- Run heavy push notifications during prayer times or Friday afternoon
- Show male/female 1:1 "date" framing in public marketing
- Exoticize the country to non-resident audiences (we are not marketing to tourists)

---

## 7. Brand-safety notes for AI-generated content

When generating copy or images via AI for Zizo Circle:
- ✅ Always specify "modest dress" and "Qatar setting" in image prompts
- ✅ Always avoid alcohol props (wine glasses, beer bottles) — replace with karak chai, fresh juice, mocktails, dates
- ✅ Run Arabic copy through a native Khaleeji speaker before publishing
- ✅ Default to mixed-gender *group* settings, not pairs
- ❌ Never auto-publish AI copy referencing religion, politics, or the royal family
- ❌ Never generate imagery of recognizable individuals
