# Website Designer — 5 Premium Design Principles

These principles separate agency-quality from generic AI output. Apply ALL to every design config.

---

## Principle 1: Intentional Constraint Violation ("Break One Rule")

Good design establishes rules. Great design breaks exactly ONE rule per section.

**How to apply:**
- Identify one "feature moment" per section
- That element gets permission to: exceed the type scale, break the grid, use a non-system color
- Everything else stays disciplined

**Example:**
```
Grid: 12 columns → hero image bleeds full width (breaks grid)
Type scale: max 48px → homepage headline uses 72px (breaks scale)
Spacing: 8px multiples → 12px label-to-value gap (breaks rhythm for tight coupling)
```

---

## Principle 2: Typographic Hierarchy Through Contrast

Adjacent levels MUST differ by 2+ properties. Size alone = amateur.

**Correct:**
```
H1: 56px, bold, serif, -0.02em tracking, dark
H2: 36px, semibold, sans-serif, normal tracking, dark
Body: 18px, regular, sans-serif, 1.7 leading, medium gray
Caption: 13px, medium, sans-serif, uppercase, 0.05em tracking, light gray
```
Each level differs in: size + weight + family/style + tracking + color.

**Anti-pattern (what AI does):**
```
H1: 48px bold, H2: 36px bold, H3: 24px bold, Body: 16px regular
→ Only size changes. Looks like a Word document.
```

---

## Principle 3: Spatial Rhythm Over Uniformity

Spacing follows a musical rhythm, not a metronome.

**The scale:**
```
Intra-component:        8-16px   (siblings, tight)
Component-to-heading:  24-32px   (title → content)
Section break related:  64-80px   (moderate topic change)
Section break new topic: 96-120px  (major topic change)
```

**Example for tourism homepage:**
```
[Hero]         ← 120px gap (major change)
[Destinations] ← 24px heading gap → 16px card gaps → 80px (moderate)
[Testimonials] ← 32px heading gap → 120px (major change)
[CTA]
```

---

## Principle 4: Color as Narrative

Color shifts through the page to guide emotional response.

**4 zones for tourism:**
```
Zone 1 (Hero/Inspire):    Saturated, rich → emotion: wonder
Zone 2 (Explore/Inform):  Light, airy → emotion: clarity
Zone 3 (Social Proof):    Warm neutrals → emotion: trust
Zone 4 (CTA/Convert):     Return to saturation → emotion: confidence
```

**Implementation:** Each section gets `data-color-zone={1-4}`. CSS custom properties shift per zone. Scrolling feels like a journey, not a stack of identical blocks.

---

## Principle 5: Motion as Meaning

Animation reveals content relationships and guides attention.

**Three rules:**
1. **Entrance reveals hierarchy**: Most important element animates first, least important last
2. **Direction = relationship**: left → new info, right → familiar, up → aspiration, down → grounding
3. **Duration = importance**: Hero 600ms (slow, important), cards 300ms (quick, scannable), nav 150ms (instant)

**Hero choreography example:**
```
t=0ms:    Background image opacity 0→1 (800ms)
t=200ms:  Headline slides up 20px + fade (500ms, ease-out)
t=400ms:  Subtitle slides up 15px + fade (400ms, ease-out)
t=600ms:  CTA slides up 10px + fade (300ms, ease-out)
t=800ms:  Scroll indicator pulses (infinite)
```

Stagger (200ms) + decreasing travel (20→15→10px) = natural waterfall.

---

## What Makes AI Sites Look Generic (Avoid These)

| Sin | AI Does | Agency Does |
|-----|---------|-------------|
| Layout | Centered 12-col everywhere | Asymmetric, overlapping, broken grid moments |
| Color | Same background all sections | 4 zones shifting through scroll |
| Typography | 1 font, 4 sizes | 2 fonts, 6-8 sizes, variable weight |
| Animation | Fade on hover | Choreographed sequences, scroll-linked |
| Spacing | Uniform 64px everywhere | Rhythmic 48-120px, density shifts |
| Content | Feature-benefit lists | Storytelling arc, social proof woven in |
| Responsive | Stacked columns | Mobile-specific: carousels, thumb zones, reorder |
