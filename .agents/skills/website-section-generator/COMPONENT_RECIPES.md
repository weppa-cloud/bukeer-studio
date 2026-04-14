# Section Generator — Component Recipes

Each recipe: primary components, animation choreography, responsive behavior, content interface.

---

## hero-centered

**Components**: Aceternity `background-beams` + Magic UI `animated-gradient-text` + Magic UI `shimmer-button`

```tsx
// Layout: full viewport, centered content over animated background
<section className="relative min-h-screen flex items-center justify-center">
  <BackgroundBeams className="absolute inset-0" />
  <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
    <motion.h1 /* stagger entrance */>
      <AnimatedGradientText>{content.headline}</AnimatedGradientText>
    </motion.h1>
    <motion.p /* 200ms delay */>{content.subtitle}</motion.p>
    <motion.div /* 400ms delay */>
      <ShimmerButton>{content.ctaText}</ShimmerButton>
    </motion.div>
  </div>
</section>

// Responsive: headline 72→48→32px, subtitle 20→18→16px, padding increases on desktop
// Animation: background instant, headline t=0, subtitle t=200ms, CTA t=400ms
```

**Content Interface:**
```typescript
{ headline: string; subtitle: string; ctaText: string; ctaHref: string; backgroundImage?: string; ariaLabel?: string }
```

---

## hero-split

**Components**: Magic UI `text-animate` + Magic UI `blur-fade` + shadcn `Button`

```tsx
// Layout: 2-col grid, text left, image right
<section className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[80vh] px-4 sm:px-8">
  <div> {/* text column */}
    <TextAnimate animation="fadeIn">{content.headline}</TextAnimate>
    <BlurFade delay={0.2}><p>{content.subtitle}</p></BlurFade>
    <BlurFade delay={0.4}><Button>{content.ctaText}</Button></BlurFade>
  </div>
  <div> {/* image column */}
    <BlurFade delay={0.3}>
      <Image src={content.image} alt={content.imageAlt} fill className="object-cover rounded-lg" />
    </BlurFade>
  </div>
</section>

// Responsive: stack image-first on mobile (order-first on image div for mobile)
// Animation: text slides from left, image fades from right
```

**Content Interface:**
```typescript
{ headline: string; subtitle: string; ctaText: string; ctaHref: string; image: string; imageAlt: string; ariaLabel?: string }
```

---

## hero-video

**Components**: Magic UI `hero-video-dialog` + Aceternity `text-generate-effect` + Magic UI `pulsating-button`

```tsx
// Layout: centered with video thumbnail + play button overlay
<section className="relative py-24 lg:py-32">
  <TextGenerateEffect words={content.headline} className="text-center" />
  <BlurFade delay={0.4}><p className="text-center">{content.subtitle}</p></BlurFade>
  <BlurFade delay={0.6}>
    <HeroVideoDialog videoSrc={content.videoUrl} thumbnailSrc={content.thumbnail} />
  </BlurFade>
</section>

// Responsive: 16:9 ratio maintained, controls below on mobile
```

**Content Interface:**
```typescript
{ headline: string; subtitle: string; videoUrl: string; thumbnail: string; thumbnailAlt: string; ariaLabel?: string }
```

---

## destinations-grid

**Components**: Aceternity `bento-grid` OR custom grid + Magic UI `magic-card`

```tsx
// Layout: 2x3 bento grid on desktop, 2-col tablet, 1-col mobile
<section className="py-20 lg:py-28">
  <motion.h2 /* fade in */>{content.heading}</motion.h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {content.destinations.map((dest, i) => (
      <motion.div key={dest.id} initial="hidden" whileInView="visible"
        variants={staggerChild} custom={i}>
        <MagicCard>
          <Image src={dest.image} alt={dest.name} />
          <h3>{dest.name}</h3>
          <p>{dest.description}</p>
        </MagicCard>
      </motion.div>
    ))}
  </div>
</section>

// Animation: stagger 100ms per card, spotlight hover effect via MagicCard
```

**Content Interface:**
```typescript
{ heading: string; destinations: Array<{ id: string; name: string; description: string; image: string; href: string }>; ariaLabel?: string }
```

---

## features-bento

**Components**: Aceternity `feature-section` OR custom + Magic UI `neon-gradient-card` + Magic UI `number-ticker`

```tsx
// Layout: bento grid with mixed sizes (2x large, 4x small)
<section className="py-20 lg:py-28">
  <h2>{content.heading}</h2>
  <p>{content.subheading}</p>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {content.features.map((feat, i) => (
      <NeonGradientCard key={feat.id} className={feat.featured ? 'md:col-span-2' : ''}>
        <feat.icon className="h-8 w-8" />
        <h3>{feat.title}</h3>
        <p>{feat.description}</p>
        {feat.stat && <NumberTicker value={feat.stat} />}
      </NeonGradientCard>
    ))}
  </div>
</section>
```

**Content Interface:**
```typescript
{ heading: string; subheading: string; features: Array<{ id: string; title: string; description: string; icon: string; stat?: number; featured?: boolean }>; ariaLabel?: string }
```

---

## testimonials-marquee

**Components**: Magic UI `marquee` + shadcn `Card` + Magic UI `avatar-circles`

```tsx
// Layout: full-width infinite scroll, pauseOnHover
<section className="py-20 lg:py-28 overflow-hidden">
  <h2 className="text-center">{content.heading}</h2>
  <AvatarCircles avatarUrls={content.avatars} numPeople={content.totalReviews} />
  <Marquee pauseOnHover speed={40}>
    {content.testimonials.map(t => (
      <Card key={t.id} className="mx-4 w-80">
        <CardContent>
          <p>"{t.quote}"</p>
          <div>{t.name} — {t.location}</div>
          <div>{'★'.repeat(t.rating)}</div>
        </CardContent>
      </Card>
    ))}
  </Marquee>
</section>

// Responsive: single row, reduced speed on mobile
```

**Content Interface:**
```typescript
{ heading: string; avatars: string[]; totalReviews: number; testimonials: Array<{ id: string; quote: string; name: string; location: string; rating: number; avatar?: string }>; ariaLabel?: string }
```

---

## stats-counter

**Components**: Magic UI `number-ticker` (4-col grid)

```tsx
// Layout: 4-col on desktop, 2-col tablet, 1-col mobile
<section className="py-16 lg:py-24">
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
    {content.stats.map((stat, i) => (
      <motion.div key={stat.id} whileInView="visible" variants={fadeUp} custom={i}>
        <NumberTicker value={stat.value} className="text-4xl font-bold" />
        <span>{stat.suffix}</span>
        <p>{stat.label}</p>
      </motion.div>
    ))}
  </div>
</section>

// Animation: count-up triggers on scroll into view
```

**Content Interface:**
```typescript
{ stats: Array<{ id: string; value: number; suffix?: string; label: string }>; ariaLabel?: string }
```

---

## partners-logos

**Components**: Magic UI `marquee` (grayscale to color on hover)

```tsx
<section className="py-12 lg:py-16">
  <p className="text-center text-sm uppercase tracking-wide">{content.heading}</p>
  <Marquee speed={30}>
    {content.logos.map(logo => (
      <Image key={logo.name} src={logo.src} alt={logo.name}
        className="h-10 w-auto mx-8 grayscale hover:grayscale-0 transition-all" />
    ))}
  </Marquee>
</section>
```

**Content Interface:**
```typescript
{ heading: string; logos: Array<{ name: string; src: string; href?: string }>; ariaLabel?: string }
```

---

## timeline-itinerary

**Components**: Aceternity `timeline`

```tsx
// Layout: vertical timeline with scroll-linked beam
<section className="py-20 lg:py-28">
  <h2>{content.heading}</h2>
  <Timeline data={content.days.map(day => ({
    title: day.title,
    content: (
      <div>
        <p>{day.description}</p>
        {day.image && <Image src={day.image} alt={day.title} />}
        {day.highlights && <ul>{day.highlights.map(h => <li key={h}>{h}</li>)}</ul>}
      </div>
    )
  }))} />
</section>

// Responsive: single column, beam hidden on mobile
```

**Content Interface:**
```typescript
{ heading: string; days: Array<{ title: string; description: string; image?: string; highlights?: string[] }>; ariaLabel?: string }
```

---

## cta-banner

**Components**: Magic UI `shimmer-button` OR `rainbow-button` + Magic UI `cool-mode`

```tsx
// Layout: full-width, color zone 4 (saturated)
<section className="py-20 lg:py-28 text-center">
  <motion.h2 variants={fadeUp}>{content.headline}</motion.h2>
  <motion.p variants={fadeUp} custom={1}>{content.subtitle}</motion.p>
  <motion.div variants={fadeUp} custom={2}>
    <CoolMode>
      <ShimmerButton size="lg">{content.ctaText}</ShimmerButton>
    </CoolMode>
  </motion.div>
</section>

// Animation: slide up from bottom, confetti on CTA click
// Responsive: padding reduces, button full-width on mobile
```

**Content Interface:**
```typescript
{ headline: string; subtitle: string; ctaText: string; ctaHref: string; ariaLabel?: string }
```

---

## faq-accordion

**Components**: shadcn `Accordion` + Magic UI `blur-fade`

```tsx
<section className="py-20 lg:py-28 max-w-3xl mx-auto">
  <BlurFade><h2>{content.heading}</h2></BlurFade>
  <Accordion type="single" collapsible>
    {content.items.map((item, i) => (
      <BlurFade key={item.id} delay={i * 0.1}>
        <AccordionItem value={item.id}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      </BlurFade>
    ))}
  </Accordion>
</section>
```

**Content Interface:**
```typescript
{ heading: string; items: Array<{ id: string; question: string; answer: string }>; ariaLabel?: string }
```

---

## contact-form

**Components**: shadcn form components + Aceternity `placeholder-and-vanish-input`

```tsx
<section className="py-20 lg:py-28 max-w-2xl mx-auto">
  <h2>{content.heading}</h2>
  <form onSubmit={handleSubmit}>
    <PlaceholderAndVanishInput placeholders={content.namePlaceholders} name="name" />
    <Input type="email" placeholder={content.emailPlaceholder} />
    <Textarea placeholder={content.messagePlaceholder} />
    <ShimmerButton type="submit">{content.submitText}</ShimmerButton>
  </form>
</section>

// Responsive: single column, floating labels, 48px touch targets
```

**Content Interface:**
```typescript
{ heading: string; namePlaceholders: string[]; emailPlaceholder: string; messagePlaceholder: string; submitText: string; ariaLabel?: string }
```

---

## newsletter

**Components**: Aceternity `placeholder-and-vanish-input` + Magic UI `shimmer-button`

```tsx
<section className="py-16 lg:py-24 text-center">
  <motion.div initial={{ scale: 0.95, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}>
    <h2>{content.heading}</h2>
    <p>{content.description}</p>
    <div className="flex max-w-md mx-auto gap-2">
      <PlaceholderAndVanishInput placeholders={content.placeholders} />
      <ShimmerButton>{content.buttonText}</ShimmerButton>
    </div>
  </motion.div>
</section>
```

**Content Interface:**
```typescript
{ heading: string; description: string; placeholders: string[]; buttonText: string; ariaLabel?: string }
```

---

## footer-4col

**Components**: 4-col grid + Magic UI `text-reveal` (optional: Magic UI `marquee` for logos)

```tsx
<footer className="py-16 lg:py-20 border-t">
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
    <div>{/* Brand column: logo, tagline, social icons */}</div>
    <div>{/* Links column 1 */}</div>
    <div>{/* Links column 2 */}</div>
    <div>{/* Contact info */}</div>
  </div>
  <div className="mt-12 pt-8 border-t text-center text-sm">
    <TextReveal>{content.copyright}</TextReveal>
  </div>
</footer>

// Responsive: 2-col → 1-col stack on mobile
```

**Content Interface:**
```typescript
{ brand: { name: string; tagline: string; logo?: string }; columns: Array<{ title: string; links: Array<{ label: string; href: string }> }>; contact: { email: string; phone?: string; address?: string }; social: Array<{ platform: string; href: string }>; copyright: string; ariaLabel?: string }
```

---

## Navigation (resizable-navbar)

**Components**: Aceternity `resizable-navbar` + Magic UI `scroll-progress`

```tsx
// Not a section per se, but the navbar component
<header className="sticky top-0 z-50">
  <ScrollProgress />
  <ResizableNavbar>
    {/* Logo, links, CTA button */}
  </ResizableNavbar>
</header>

// Behavior: full width on top, shrinks to pill on scroll
// Responsive: hamburger on mobile with slide-in panel
```

---

## destinations-map

**Components**: Aceternity `world-map` OR Magic UI `globe` / `dotted-map`

```tsx
// MUST lazy-load (heavy WebGL/Canvas)
const WorldMap = dynamic(() => import('@/components/aceternity/world-map'), { ssr: false })

<section className="py-20 lg:py-28">
  <h2>{content.heading}</h2>
  <WorldMap dots={content.locations} lineColor={zoneAccent} />
</section>

// Responsive: static image fallback on mobile (< 768px)
```

**Content Interface:**
```typescript
{ heading: string; locations: Array<{ lat: number; lng: number; label: string }>; ariaLabel?: string }
```
