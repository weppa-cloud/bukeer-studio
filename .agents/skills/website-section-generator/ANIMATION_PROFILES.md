# Section Generator — Animation Profiles

Motion profiles per preset. All use framer-motion v12 + CSS keyframes from globals.css.

## framer-motion Patterns

### Core Imports
```tsx
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion'
```

### Standard Variants
```tsx
// Fade up (most common entrance)
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * STAGGER, duration: ENTRANCE, ease: EASING }
  })
}

// Fade in (no movement)
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: ENTRANCE, ease: EASING } }
}

// Scale up (cards, CTAs)
const scaleUp = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: ENTRANCE, ease: EASING } }
}

// Slide from left (text columns in split layouts)
const slideLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: ENTRANCE, ease: EASING } }
}

// Slide from right (image columns in split layouts)
const slideRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: ENTRANCE, ease: EASING } }
}
```

### Scroll-Triggered Pattern
```tsx
function Section() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeUp}
    >
      {/* content */}
    </motion.section>
  )
}
```

### Stagger Children Pattern
```tsx
const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: ENTRANCE, ease: EASING } }
}

// Usage
<motion.div variants={container} initial="hidden" whileInView="visible">
  {items.map(i => <motion.div key={i} variants={item} />)}
</motion.div>
```

### Reduced Motion
```tsx
// Always include this check
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Apply: set y/x to 0, scale to 1, use opacity only
const safeVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
  : fullVariants
```

---

## Preset Timing Constants

### Aventura (Adventure)
```tsx
const ENTRANCE = 0.4    // 400ms — energetic
const STAGGER = 0.1     // 100ms — fast cascade
const EASING = [0.25, 1, 0.5, 1]  // snappy ease-out
const PARALLAX_RANGE = [0, -40]    // dynamic (20-40px travel)
```

### Lujo (Luxury)
```tsx
const ENTRANCE = 0.7    // 700ms — slow, deliberate
const STAGGER = 0.25    // 250ms — luxurious reveal
const EASING = [0.16, 1, 0.3, 1]  // silky smooth
const PARALLAX_RANGE = [0, -10]    // subtle (5-10px)
```

### Tropical
```tsx
const ENTRANCE = 0.5    // 500ms — relaxed
const STAGGER = 0.15    // 150ms — playful
const EASING = [0.34, 1.56, 0.64, 1]  // slight overshoot/bounce
const PARALLAX_RANGE = [0, -20]    // medium (10-20px)
```

### Corporativo (Corporate)
```tsx
const ENTRANCE = 0.3    // 300ms — efficient
const STAGGER = 0.08    // 80ms — quick
const EASING = [0.4, 0, 0.2, 1]   // M3 standard
const PARALLAX_RANGE = [0, 0]      // none
```

### Boutique
```tsx
const ENTRANCE = 0.55   // 550ms — refined
const STAGGER = 0.18    // 180ms — considered
const EASING = [0.22, 1, 0.36, 1]  // elegant
const PARALLAX_RANGE = [0, -15]    // subtle (5-15px)
```

### Cultural
```tsx
const ENTRANCE = 0.5    // 500ms
const STAGGER = 0.16    // 160ms
const EASING = [0.16, 1, 0.3, 1]
const PARALLAX_RANGE = [0, -20]    // medium
```

### Eco
```tsx
const ENTRANCE = 0.5    // 500ms
const STAGGER = 0.15    // 150ms
const EASING = [0.25, 1, 0.5, 1]
const PARALLAX_RANGE = [0, -10]    // subtle (nature = grounded)
```

### Romantico (Romantic)
```tsx
const ENTRANCE = 0.65   // 650ms — dreamy
const STAGGER = 0.22    // 220ms — slow reveal
const EASING = [0.16, 1, 0.3, 1]  // flowing
const PARALLAX_RANGE = [0, -10]    // subtle
```

---

## CSS Keyframes (from globals.css)

These are already defined in `web-public/app/globals.css`:

```css
/* Use via Tailwind: animate-spotlight, animate-fade-in, etc. */
@keyframes spotlight { /* opacity + translate + scale */ }
@keyframes fade-in { /* opacity 0 → 1 */ }
@keyframes slide-up { /* translateY(10px) → 0 + opacity */ }
@keyframes zoom-in { /* scale(0.95) → 1 + opacity */ }
@keyframes gradient { /* background-position shift */ }
```

Use CSS keyframes for: background effects, loading states, infinite loops.
Use framer-motion for: entrance animations, scroll-triggered, interactive, layout.

---

## Hero Choreography Templates

### Centered Hero (luxury/romantic)
```
t=0ms:    Background opacity 0→1 (800ms, ease)
t=200ms:  Headline y:20→0 + opacity (600ms, smooth)
t=450ms:  Subtitle y:15→0 + opacity (500ms, smooth)
t=700ms:  CTA y:10→0 + opacity (400ms, smooth)
t=1000ms: Scroll indicator pulse (infinite, 2s period)
```

### Split Hero (adventure/corporate)
```
t=0ms:    Image column x:30→0 + opacity (500ms)
t=100ms:  Headline x:-20→0 + opacity (400ms)
t=250ms:  Subtitle opacity (300ms)
t=400ms:  CTA scale:0.95→1 + opacity (300ms)
```

### Video Hero (tropical/eco)
```
t=0ms:    Video thumbnail opacity (500ms)
t=200ms:  Headline words generate one-by-one (text-generate-effect)
t=600ms:  Play button scale bounce (400ms, overshoot easing)
```

---

## Performance Rules

1. Max 3-4 animated elements visible at once
2. Use `useInView({ once: true })` — don't re-animate on scroll back
3. Heavy components (globe, map, particles): `dynamic(() => import(...), { ssr: false })`
4. Parallax via `useScroll` + `useTransform` — GPU-accelerated (transform only)
5. Always respect `prefers-reduced-motion` — fall back to opacity-only
6. Never animate `width`, `height`, or `top/left` — only `transform` and `opacity`
