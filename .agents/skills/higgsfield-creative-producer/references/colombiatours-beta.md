# ColombiaTours Beta Creative Reference

Use this reference when producing Higgsfield-style assets for the ColombiaTours pilot.

## Brand Direction

ColombiaTours should feel:
- Local expert, not generic OTA.
- Premium enough for trust, warm enough for leisure travel.
- Vivid Colombian landscapes, real itinerary detail, and practical conversion.
- WhatsApp-first for beta conversion, because Booking V1 is deferred.

Avoid:
- Generic tropical stock cliches that could be any country.
- Overly luxury visuals that conflict with family/adventure packages.
- Fake maps, fake airline/hotel logos, fake government marks, invented awards.
- Text embedded in generated images/video frames.

## Recommended Creative Presets

### Destination Hero Loop

Use for homepage/destination hero.

- Format: 16:9 or 21:9
- Duration: 5-8 sec
- Motion: slow drone reveal, gentle push-in, or parallax landscape
- Copy-safe area: center-left or center-right depending on layout
- Prompt pattern:

```text
Cinematic travel hero video for ColombiaTours, authentic Colombia destination, golden hour natural light, real travel agency editorial style, slow stabilized camera movement, vivid but realistic color, no text, no logos, no fake signs, clean negative space for website headline, premium local tourism feeling
```

### Package Reel

Use for packages and social ads.

- Format: 9:16
- Duration: 8-15 sec
- Structure: hook -> itinerary proof -> WhatsApp CTA moment
- Camera logic: 3-4 quick but clean shots, no chaotic transitions
- Prompt pattern:

```text
Vertical UGC-style travel ad for a Colombia tour package, opening hook in the first second, authentic traveler point of view, local guide moment, scenic destination reveal, warm human energy, natural handheld camera with polished stabilization, realistic Colombian setting, no overlaid text, no brand logos, conversion-ready ending with space for WhatsApp CTA overlay
```

### Activity Proof Clip

Use for activities.

- Format: 9:16 or 16:9
- Duration: 5-10 sec
- Structure: action detail -> safety/trust cue -> destination context
- Prompt pattern:

```text
Short cinematic activity clip in Colombia, realistic travelers enjoying the activity with a professional local guide, clear safety cues, natural movement, documentary travel style, sharp environmental details, no dangerous behavior, no impossible terrain, no text, no logos
```

### OG / Social Still

Use for metadata and social cards.

- Format: 1.91:1
- Style: editorial, readable, strong focal point
- Prompt pattern:

```text
Editorial travel image for ColombiaTours, authentic Colombia destination, polished tourism photography, natural colors, strong focal subject with clean negative space, no text, no logos, no artificial watermark, realistic people and place
```

## Colombia Destination Cues

Cartagena:
- Colonial walls, warm Caribbean light, colorful streets, sea breeze, rooftops.
- Avoid making it look like Havana or generic Mediterranean coast.

Eje Cafetero:
- Coffee farms, wax palms, green mountains, rural hospitality.
- Avoid fake alpine villages or non-Colombian mountain cabins.

Amazonas:
- River, rainforest canopy, respectful nature travel, local guide.
- Avoid unsafe wildlife contact or exaggerated fantasy jungle.

Medellin / Antioquia:
- Mountains, modern city, cable car, Guatape color/rock context when relevant.
- Avoid making urban scenes look like generic US/EU skylines.

San Andres:
- Clear Caribbean water, island rhythm, beach activity.
- Avoid Maldives/Bali visual language if the package is explicitly Colombia.

## QA Checklist

- The output clearly looks like the intended Colombian destination or remains safely generic.
- No generated text appears in the media.
- No fake official logos, certifications, hotel marks, or airline marks.
- People are plausible and not celebrity-like.
- Activity scenes are safe and consistent with itinerary claims.
- Website hero videos keep a calm area for overlaid copy.
- Asset will be registered in `media_assets` or the backfill path is documented.
- Alt text and captions are prepared in the target locale.
