# Marketing site deployment

The `marketing/` folder is deployed automatically to **zizocircle.com** via GitHub Pages whenever changes land on `main`.

## URL map (after deploy)

| Path | What it is |
|---|---|
| `/` | English landing page |
| `/ar/` | Arabic landing page |
| `/thank-you.html` | Bilingual confirmation (use `?lang=ar`) |
| `/venue-partner.html` | English venue one-pager (print as A4 PDF) |
| `/ar/venue-partner.html` | Arabic venue one-pager |
| `/instagram/posts.html` | English IG feed posts (export to PNG) |
| `/instagram/stories.html` | English IG stories |
| `/instagram/ar/posts.html` | Arabic IG feed posts |
| `/instagram/ar/stories.html` | Arabic IG stories |

## One-time setup (do this in the GitHub UI)

### 1. Enable Pages
1. Go to **Repo → Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. Save

### 2. Configure the custom domain
1. In **Repo → Settings → Pages**, set **Custom domain** to `zizocircle.com`
2. Tick **Enforce HTTPS** (will be greyed out until DNS verifies — usually 5–30 minutes)
3. The `marketing/CNAME` file in this repo is what tells Pages the domain — don't delete it.

### 3. DNS for zizocircle.com (at your registrar — GoDaddy / Namecheap / Cloudflare / etc.)

Apex domain (`zizocircle.com`) — add **all four** A records:
```
A  @  185.199.108.153
A  @  185.199.109.153
A  @  185.199.110.153
A  @  185.199.111.153
```

`www` subdomain — add a CNAME:
```
CNAME  www  mohamedzaidan1990-cyber.github.io
```

> If you use Cloudflare: set the records to **DNS only** (grey cloud, not orange) for the initial verification, then you can re-enable proxying.

### 4. (Once DNS resolves) verify

Run:
```bash
dig +short zizocircle.com
# expected:
# 185.199.108.153
# 185.199.109.153
# 185.199.110.153
# 185.199.111.153
```

Then visit https://zizocircle.com — should serve `marketing/index.html`.

---

## Firestore — one-time setup for the waitlist

The landing forms write to a `waitlist` collection in the `zizo-circle` Firebase project (the same one the app uses).

### Deploy the rules

The committed file `firestore.rules` (at repo root) already includes a public-create-only block for `waitlist`. To deploy it:

```bash
# install once
npm install -g firebase-tools
firebase login

# from repo root
firebase use zizo-circle
firebase deploy --only firestore:rules
```

> ⚠️ The `firestore.rules` file in this repo only contains the `waitlist` block. Before deploying, paste your existing rules for `users`, `venues`, `wallet`, etc. into the same file under the comment that says "keep your existing rules below this block unchanged" — otherwise you'll lock the app out of those collections.

### Read signups

In the Firebase console: **Firestore → Data → waitlist**. Each doc looks like:

```json
{
  "email": "salem@example.com",
  "lang": "ar",
  "source": "landing-ar",
  "userAgent": "Mozilla/5.0 …",
  "referrer": "https://instagram.com/",
  "createdAt": "2026-05-12T14:21:05Z"
}
```

Export to CSV from the Firebase console for ad campaign uploads, or build a Cloud Function that auto-emails them a confirmation later.

---

## Local preview

```bash
cd marketing && python3 -m http.server 8080
```

Then test the full flow:
1. Open `http://localhost:8080/` → fill the email → submit
2. Should redirect to `http://localhost:8080/thank-you.html?lang=en&email=…`
3. Check Firebase console → Firestore → `waitlist` collection — your doc should be there

For Arabic: `http://localhost:8080/ar/` → submits → redirects to `/thank-you.html?lang=ar&email=…`.
