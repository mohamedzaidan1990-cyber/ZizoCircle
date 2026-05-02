# Zizo Circle — Product Marketing Context

> Foundational context document. All marketing skills (launch-strategy, page-cro, social-content, programmatic-seo, etc.) read this first.

## What it is
Zizo Circle is a mobile app (iOS + Android, React Native / Expo) that uses AI to match people in Qatar with others nearby who share their real interests, and rewards every meet-up with cashback at partner venues.

Three pillars:
1. **AI Matching** — surfaces people within range whose interest overlap is ≥ 70%
2. **Venue Discovery** — curated places filtered by your budget, mood, and group composition
3. **Cashback Wallet** — every visit to a partner venue earns QR (Qatari Riyal) credit, redeemable in-app

## Who it is for
**Primary persona — "The New Connector"**
- Age 22–35, lives in Doha, Lusail, or Al Wakrah
- Expat (≈ 88% of Qatar residents are expats: Indian, Filipino, Egyptian, British, Pakistani, Sri Lankan, etc.) OR young Qatari national
- Recently moved or has been here 1–4 years; close friend group is small or thinned out by people leaving
- Works in finance, tech, energy, healthcare, hospitality, government, or is a student at a branch campus (Education City)
- Spends QAR 1,500–4,500/mo on going out (cafés, brunch, padel, gym classes, dining)
- Already uses Talabat, Snoonu, Rafeeq for delivery and Instagram for venue discovery

**Secondary personas**
- Young Qatari nationals looking to expand a beyond-school social circle while staying within culturally appropriate group settings
- Couples who want to meet other couples (double-dates, padel pairs)
- Hobbyists looking for a fourth player (padel, board games, chess club)

## What problem it solves
- **Loneliness in a transient city.** Qatar has one of the highest expat turnover rates in the GCC. Friend groups dissolve every 12–24 months as contracts end.
- **Discovery is broken.** Instagram surfaces the same 30 cafés. There's no way to find people who actually want to do *the specific thing* you want to do tonight.
- **Going out is expensive.** QAR 80–200 per outing adds up. Cashback gives a reason to choose Zizo's recommended venues over a generic Instagram pick.

## Why now
- Post-World-Cup Qatar has invested heavily in lifestyle infrastructure (Lusail Boulevard, Place Vendôme, Msheireb Downtown, Old Doha Port)
- Qatar Vision 2030 emphasizes social cohesion and resident wellbeing
- Smartphone penetration is ~99%; Instagram + WhatsApp dominate; the audience is digitally fluent and ready
- No localized competitor owns the "AI + interest-matching + cashback" wedge in Qatar

## Differentiation
| | Zizo Circle | Bumble BFF / Meetup | Instagram + WhatsApp groups |
|---|---|---|---|
| Localized to Qatar | ✅ | ❌ | ➖ |
| AI interest matching | ✅ | ❌ (manual swipe) | ❌ |
| Cashback at venues | ✅ | ❌ | ❌ |
| Curated venues | ✅ | ❌ | ➖ |
| Designed for group-friendly culture | ✅ | ❌ (1:1 framing) | ➖ |
| Phone-first (+974 default) | ✅ | ❌ | ✅ |

## Brand pillars
- **Belonging** — "you're not alone in this city"
- **Discovery** — "the best of Doha, but the parts you'd actually like"
- **Reward** — "going out should give back"
- **Respect** — culturally aware; group-first; never positioned as a dating app

## Brand voice
Warm, confident, slightly playful, never pushy. Mixes English and the occasional Arabic word naturally (`yalla`, `inshallah`, `habibi/habibti` used sparingly and with care). Never uses slang the audience wouldn't actually say. Speaks to *residents of Qatar*, not tourists.

**Voice do's:** specific, generous, curious, low-key confident, multicultural-aware
**Voice don'ts:** salesy, ironic, alcohol-referencing, dating-app-flirty, exclusionary, exoticizing ("Arabian nights," "desert magic," etc. — avoid)

## Color & visual system (from app code)
- Primary purple: `#7B5CF6`
- Pink accent: `#F53B8F`
- Teal accent: `#3BF5C8`
- Lime (used for "match" badges): `#C8F53B`
- Orange accent: `#F5A53B`
- Background near-black: `#0B0914`
- Card surface: `#181428`
- Border: `#231E3A`
- Text high: `#F0EEF8`
- Text muted: `#7A7595`

Mascot: **Zizo** — a friendly purple-skinned AI companion character (visible in `app/zizo-intro.tsx` and `components/ZizoAvatars.tsx`).

## Onboarding flow (current)
welcome → phone (+974 default) → otp → zizo-intro → tos → permissions → interests (min 3 of ~34 chips) → profile-setup → tabs (matches, venues, wallet, zizo, profile)

7-step progress bar visible on most screens. Phone OTP is primary; Email is alternate; Google + Apple are "Coming Soon" stubs.

## Conversion goal
**Primary:** Phone OTP completion → profile-setup completion → first match-or-venue interaction within 7 days.
**Secondary:** Wallet activation (first cashback redemption) within 30 days.

## Cultural & regulatory constraints
- No alcohol mentions in copy or imagery
- No imagery of unaccompanied women in ways that could read as suggestive; modest framing throughout
- Group / friend-circle framing always preferred over 1:1 "match" framing in public-facing copy (in-app the "match" terminology is fine because the context is platonic interest-matching)
- Must work flawlessly in Ramadan (iftar venues, suhoor, late-night usage spike)
- Eid Al-Fitr and Eid Al-Adha are major social occasions — calendar around them
- Qatar National Day (Dec 18) and Qatar National Sports Day (second Tuesday of February) are anchor moments
- Arabic copy MUST be reviewed by a native MSA / Khaleeji-aware speaker before publishing — drafts in this repo are starting points, not final

## Stage
Pre-launch / early access. App version 0.1, Firebase-backed, EAS build pipeline configured. No public marketing site discovered in the repo at the time of writing — landing pages will need to be built (likely as a static export from this Expo web target, or as a separate Next.js site).

## What we don't have yet (gaps the marketing plan must account for)
- No public website / landing page URL
- No published App Store / Play Store listing
- No measurable traffic or session data
- Google + Apple Sign-In are still "Coming Soon" stubs — onboarding friction risk
- No referral mechanic in the app yet
- No known venue partnerships listed in code — cashback economics need validation
