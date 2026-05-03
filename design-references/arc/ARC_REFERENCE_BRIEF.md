# Arc — Design Reference Brief for LSAT U

> Source: `https://arc.net/` extracted with designlang v12.2.0 on 2026-05-03.
> Full extraction artifacts: `design-references/arc/extract/`.
> Visual preview: `design-references/arc/extract/arc-net-preview.html`.

This brief translates Arc's public marketing surface into actionable guidance for the LSAT U homepage / auth-entry redesign. It is **reference DNA, not a copy target**. The goal is to extract the principles that make Arc feel premium, calm, and product-led, and apply them to a serious LSAT training app — not to make LSAT U look like a browser.

---

## 1. What Arc's visual system is actually doing

Arc's landing page is a deliberate exercise in **chromatic and material restraint, paired with typographic confidence**. The whole page operates on a tiny token budget:

- **7 unique colors total** — including all neutrals, brand, and accent.
- **3 border radii** — `4 / 8 / 22`.
- **2 shadows** — both very soft.
- **5 z-index layers** — almost no stacking.
- **62 flex containers, 0 CSS grids** — entirely flow + flex composition.

Then it spends its whole expressive budget on **type** (8 font families, including custom proprietary Marlin and Marlin Soft SQ) and **one signature accent color** used 296 times (`#3139fb`). The page is loud where it counts and silent everywhere else.

The overall material is **flat**. Surfaces are not glassy, not embossed, not heavily shadowed. Depth comes from generous whitespace, careful type scale, and the warm off-white background, not from chrome.

Voice is **friendly, "you"-only, Title Case, verbose headlines** — closer to a Sunday-paper copywriter than a SaaS product team. The primary CTA verb across the page is `download`.

The single most distinctive move is the **warm off-white background `#fffcec`** instead of pure white or cool porcelain. This is what makes Arc feel like a finished product rather than a generic landing page. Almost every premium-feeling site you can think of (reMarkable, Linear's old site, Stripe's marketing, Notion's marketing) tilts off pure white toward a warm or cool tinted neutral. Arc tilts warm.

---

## 2. Layout ideas useful for LSAT U

### 2a. Two-shadow / three-radius / seven-color budget
Constrain LSAT U's auth/homepage to a similar token budget. The current direction (I1) has cool porcelain + cool slate accent + multi-stop gradients; that is more chromatic surface than Arc allows itself. **Adopt Arc's budget discipline:** count tokens, kill duplicates.

Concretely, for the new homepage/auth surface:
- One off-white page background.
- One ink color for type.
- One muted neutral (for hairlines, secondary text).
- One brand accent (used sparingly but confidently).
- Two shadows, both soft.
- Three radii, the largest one being a distinctive "soft pill" (Arc uses 22px).

### 2b. The 2px → 32px spacing jump
Arc's spacing scale is `2 · 32 · 37 · 48 · 64 · 72 · 80 · 90 · 128 · 150`. There is **nothing between 2px and 32px**. Micro-detail at 2px (hairlines, inset shadows), then leap to generous space. **This is what makes the page feel airy** — the absence of 4/8/12/16/24 multipliers in the body composition.

For LSAT U: don't fight the bootcamp's existing 4/8/16/24 grid (it's correct for dense product surfaces), but **the marketing/auth homepage can use the Arc jump pattern** — 2px borders + 32px+ section spacing — to deliberately feel different from the inside-the-app surfaces. The auth page should not feel like a logged-in dashboard.

### 2c. Type as the primary visual element
Arc uses two paired display faces (Marlin + Marlin Soft SQ) and lets them carry the page. Headings are Title Case and verbose ("Arc is the Chrome replacement I've been waiting for"). The size hierarchy is tight: `h1 45.51px / 700 / line-height 42.25px` — line-height **smaller** than the size. This is typographic confidence — only works at large sizes with great type.

For LSAT U: the existing copy direction ("Master the LSAT. Own your future.") is closer to Apple than to Arc — short, direct, capitalized. Keep it. But adopt Arc's principle: **let type carry the page**. The auth surface should not need a giant 3D diorama or animated background to feel premium — large, confident, well-spaced type on a warm off-white surface is the move.

### 2d. Section composition
Reading order detected: `nav → testimonial → content → sidebar → testimonial → testimonial → content → content → footer`. Note: testimonials early and often, content blocks alternating with sidebar moments. Arc's home is essentially a long-form scroll with constant proof points.

For LSAT U auth/homepage: a single-screen "sign in here" page is fine, but if the page goes to a 4-section scroll story (current I1 direction), it should follow Arc's pacing — **proof points and human voice early**, not gallery shots. A student testimonial in section 2 beats a platform-preview screenshot.

---

## 3. Color / token ideas useful

### 3a. Warm off-white base — adopt
Arc's `#fffcec` is the single most copyable token. **Replace LSAT U's cool porcelain `#ECEFF3` with a warm off-white** (`#fffcec` directly, or `#FAF7F1` / `#FFFAEE` for a slightly more paper-like read). This single change shifts the page from "tech SaaS" to "premium product."

### 3b. One signature accent, not three
Arc uses `#3139fb` 296 times. The current I1 cool slate `#4A6E94` is muted to the point of disappearing. **Pick one confident LSAT U accent** and let it carry every emphasis moment — buttons, focus rings, highlight underlines, status pulses. Candidates:
- A confident product blue (Arc-like but distinct, e.g. `#1F3FE3` or `#2A4FD8`)
- An ink-blue (the "law-school bound book" tone, `#1A2A52` or `#15224A`)
- A bronze/aged gold *(but only if Joshua's voice canon supports it; current direction has explicitly forbidden gold)*

### 3c. Cream as a tinted surface
Arc's `#fffadd` is used 54 times as a soft warm surface for cards/quote blocks. **Useful for LSAT U's "today's lesson preview" tile or testimonial blocks** — a faint warm tint on the off-white base reads as paper, not chrome. Avoid using glass/blur for these surfaces; a flat warm-cream fill with a 1px hairline border is more Arc.

### 3d. One mid-grey only
Arc has exactly one mid-grey (`#696969`) for muted text. **Stop using 4–6 neutral steps on the auth page**. One ink + one mid-grey is enough.

### 3e. Two shadows only
Arc's shadows are tiny: `0 2px 8px rgba(0,0,0,0.25)` and `0 5px 5px rgba(0,0,0,0.10)`. **Replace I1's heavy multi-stop shadows with these two values**. The page will read as flatter and more confident.

---

## 4. What should NOT be copied

### 4a. 8 font families
Arc gets away with this because Marlin and Marlin Soft SQ are **proprietary custom faces commissioned for the Browser Company brand**. LSAT U does not have that. **Stay disciplined to 2 families**: a serif (Fraunces, already in the bootcamp) for editorial moments + Inter for product UI. Adding a mono or a third display face is a regression.

### 4b. Verbose Title Case headlines
Arc's "Arc is the Chrome replacement I've been waiting for" works for a friendly browser brand. LSAT U's audience is aspiring lawyers under stress; verbose conversational headlines read as soft. **Keep the short, direct, capitalized voice** ("MASTER THE LSAT. OWN YOUR FUTURE."). That's closer to Apple's product voice than to Arc's marketing voice — and it's more correct for the product.

### 4c. The download-led CTA pattern
Arc's primary verb across the page is `download` — they're shipping a desktop app. LSAT U is a web product; the CTA is `Sign in` / `Begin`. Don't import the verb pattern.

### 4d. Glass / heavy backdrop-filter
The current I1 direction leans heavily on `backdrop-filter: blur(28px) saturate(1.4)` and frosted glass surfaces. **Arc has none of this.** Glass is a Vision Pro / Apple OS visual idiom; Arc is flat. If we want Arc's calm, the glass has to come down. Glass surfaces remain valid for the inside-app dashboard (where the user has logged in and the visual idiom can shift), but the public auth/homepage should be flat surfaces with subtle shadows.

### 4e. The proprietary brand mark composition
Arc's brand mark, vertical sidebar testimonials, and signature gradient compositions are theirs. Don't reproduce them. The LSAT U brand needs its own marks.

### 4f. 749 duplicate CSS declarations
Arc has 749 duplicate declarations and 8 font families — both flagged by designlang. **These are not virtues**, just consequences of a marketing site shipped fast. LSAT U's auth page should ship token-clean.

### 4g. Animated pixel-perfect prop-shots
The current I1 direction has a 3-layer 3D diorama (`.layer-far` + `.layer-main` + `.layer-front`) with cursor-aware parallax. **Arc has nothing remotely like this.** Arc is calm. If the goal is Arc-calm, the diorama goes; the auth form sits inline on the warm off-white surface, with the lesson-preview tile next to it as a flat warm-cream card. If the goal is Apple Vision Pro spatial drama, that's a different reference DNA — pick one, not both.

---

## 5. How to translate Arc into the LSAT U homepage / auth page

The goal: take Arc's calm + chromatic restraint + warm off-white + type-led hierarchy, and translate that into a serious, focused LSAT training entry surface that does not feel like a browser landing page.

### Tokens (proposed, for the homepage/auth surface only)

```
--bg-page:        #FBF8F1   /* warm off-white, slightly more paper-like than Arc */
--bg-tinted:      #F5EFE2   /* faint warm cream — for cards, quote blocks */
--ink:            #15171D   /* near-black with the slightest blue cast */
--muted:          #6F7480   /* one mid-grey, for hairlines and secondary text */
--accent:         #1F3FE3   /* one confident product blue */
--accent-soft:    #DCE2FA   /* tint for hover/focus surfaces */

--radius-sm:      4px
--radius-md:      8px
--radius-pill:    22px      /* Arc-style soft pill on CTAs */

--shadow-soft:    0 2px 8px rgba(15,17,29,0.06)
--shadow-lift:    0 5px 18px rgba(15,17,29,0.08)

--space-unit:     2px       /* hairlines, inset borders */
--space-section:  96px      /* between hero / testimonials / CTA */
```

### Typography (proposed)

- **Display** (h1, hero greeting): Fraunces serif. Title Case, but **short** (Apple voice, not Arc voice). Example: "Master the LSAT." / "Own your future."
- **Product UI** (forms, body, nav, buttons): Inter.
- **Editorial accent** (one-liner pull-quotes, attribution): Fraunces italic.

Heading scale (proposed):
- h1: `64–72px / 700 / line-height 0.96 / letter-spacing -0.03em`
- h2: `40px / 600 / line-height 1.05`
- body: `16px / 400 / line-height 1.55`

### Layout shape (proposed)

A **single-section page** by default — don't ship the 4-section scroll until there's content to fill it honestly. The auth page is:

1. Top bar: brand mark left, "Sign up" link right. No glass pill, no heavy chrome — just a 1px hairline below the bar at scroll.
2. Centered hero column, max-width ~640px:
   - Eyebrow: small caps Inter, 11px, muted: "Aspiring Attorneys"
   - Display title: "Master the LSAT." then a softer second line "Own your future." (lighter weight, muted ink)
   - Lede: "Clearer thinking, higher scores." (16px, muted)
3. **Inline sign-in card to the right of (or below) the hero** — flat warm-cream tinted surface, one hairline, one soft shadow. Email + password + "Continue" + "or continue with Google" + "Forgot password?" — no modal, no diorama, no parallax.
4. Below the fold (optional, only when content exists): a single proof-point row (one student quote on a warm-cream block) → final CTA.
5. Footer: 1 line, Inter 11px, muted. Copyright + 2 links.

### Motion (proposed)

Almost none. Arc's homepage has no parallax, no auto-playing video on the marketing page, no continuous motion. **Adopt this.** The only motion on the LSAT U auth page should be:
- 240ms ease-out fade-in of the page on first paint
- 180ms transform/opacity transitions on input focus and button hover
- Nothing else. No scroll-reveal, no parallax, no cursor-aware tilt.

`prefers-reduced-motion` zeroes the fade-in.

### What this looks like vs current I1

| Dimension | Current I1 | Arc-translated proposal |
|---|---|---|
| Page background | `#ECEFF3` cool porcelain | `#FBF8F1` warm off-white |
| Accent | `#4A6E94` muted cool slate (disappears) | `#1F3FE3` confident product blue |
| Surfaces | Frosted glass, `backdrop-filter` everywhere | Flat warm-cream tinted cards, 1 soft shadow |
| Composition | 3-layer 3D diorama with parallax | Inline form on the surface, no diorama |
| Sections | 4-section scroll story | 1 section (auth) + optional proof row |
| Motion | Scroll-reveal + cursor parallax + section reveals | Fade-in on load, focus/hover only |
| Type | Inter sans only, 76px hero | Fraunces serif h1, Inter body, 64–72px hero |
| Shadows | Multi-stop (`0 110px 140px -50px ...`) | 2 values, both soft |

The result is closer to a serious training-product entry surface (think reMarkable's site or Linear's old marketing) than to a tech-bro SaaS landing or a spatial-OS demo.

---

## 6. Verification checklist — when does the auth page feel "Arc-correct"?

- [ ] Page background is warm, not cool. (Hold a sheet of printer paper next to the screen — page should look closer to the paper than to the printer paper, slightly warmer.)
- [ ] Token count is ≤ 7 colors, ≤ 3 radii, ≤ 2 shadows on the auth surface.
- [ ] One accent color, used confidently. (Count occurrences. If the accent shows up fewer than 4 times on the page, it's not doing the work.)
- [ ] Type carries the page. The hero copy reads as "premium" without any decorative graphic behind it.
- [ ] The auth form is inline, not in a modal. Sign-in is the obvious action.
- [ ] No glass, no parallax, no diorama. The page is calm at idle.
- [ ] WCAG AA passes on every text/bg pair. (Arc passes 100%; LSAT U should match.)
- [ ] The page does not look like a browser-company landing. It looks like a serious training tool that someone authored carefully.

---

_Last updated: 2026-05-03. This brief lives at `design-references/arc/ARC_REFERENCE_BRIEF.md`. Companion artifacts in `design-references/arc/extract/`._
