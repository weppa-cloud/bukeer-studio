# Bukeer Signature Tokens For Next/v0

> Date: 2026-05-18
> Purpose: give v0, UI designers and Next engineers a concrete token map for the non-generic Bukeer Admin direction.

## Source

Source palette comes from `bukeer_flutter/DESIGN.md`.

## CSS Variables

Use this token block when asking v0 to generate signature UI or when building a shadcn-compatible design system registry.

```css
:root {
  --bukeer-primary: #7c57b3;
  --bukeer-on-primary: #ffffff;
  --bukeer-secondary: #39d2c0;
  --bukeer-on-secondary: #ffffff;
  --bukeer-tertiary: #ee8b60;
  --bukeer-on-tertiary: #ffffff;
  --bukeer-success: #34d399;
  --bukeer-success-strong: #048178;
  --bukeer-warning: #fcdc0c;
  --bukeer-error: #ff5963;

  --bukeer-surface-light: #f1f4f8;
  --bukeer-surface-card: #ffffff;
  --bukeer-on-surface: #14181b;
  --bukeer-on-surface-muted: #57636c;
  --bukeer-outline: #e0e3e7;

  --bukeer-surface-dark-lowest: #15161e;
  --bukeer-surface-dark: #1b1d24;
  --bukeer-surface-dark-container: #2a2f3c;
  --bukeer-surface-dark-card: #262830;
  --bukeer-on-dark: #ffffff;
  --bukeer-on-dark-muted: #a9adc6;
  --bukeer-outline-dark: #313442;

  --bukeer-agent-structural: var(--bukeer-primary);
  --bukeer-agent-live: var(--bukeer-secondary);
  --bukeer-agent-human-loop: var(--bukeer-tertiary);
  --bukeer-agent-approved: var(--bukeer-success);
  --bukeer-agent-rejected: var(--bukeer-error);
  --bukeer-agent-warning: var(--bukeer-warning);

  --bukeer-radius-panel: 8px;
  --bukeer-radius-control: 6px;
  --bukeer-radius-pill: 28px;

  --font-bukeer-display: "Outfit", ui-sans-serif, system-ui, sans-serif;
  --font-bukeer-body: "Readex Pro", ui-sans-serif, system-ui, sans-serif;
}
```

## shadcn-Compatible Role Mapping

Recommended mapping for Bukeer Admin Next exploration:

```css
:root {
  --background: 215 28% 96%;
  --foreground: 200 14% 9%;
  --card: 0 0% 100%;
  --card-foreground: 200 14% 9%;
  --popover: 0 0% 100%;
  --popover-foreground: 200 14% 9%;
  --primary: 262 36% 52%;
  --primary-foreground: 0 0% 100%;
  --secondary: 174 62% 52%;
  --secondary-foreground: 0 0% 100%;
  --muted: 210 18% 93%;
  --muted-foreground: 201 11% 38%;
  --accent: 19 81% 65%;
  --accent-foreground: 0 0% 100%;
  --destructive: 356 100% 67%;
  --destructive-foreground: 0 0% 100%;
  --border: 210 12% 89%;
  --input: 210 12% 89%;
  --ring: 262 36% 52%;
  --radius: 0.5rem;
}

.dark {
  --background: 235 17% 10%;
  --foreground: 0 0% 100%;
  --card: 230 11% 17%;
  --card-foreground: 0 0% 100%;
  --popover: 230 11% 17%;
  --popover-foreground: 0 0% 100%;
  --primary: 262 36% 52%;
  --primary-foreground: 0 0% 100%;
  --secondary: 174 62% 52%;
  --secondary-foreground: 0 0% 100%;
  --muted: 224 18% 20%;
  --muted-foreground: 233 18% 72%;
  --accent: 19 81% 65%;
  --accent-foreground: 0 0% 100%;
  --destructive: 356 100% 67%;
  --destructive-foreground: 0 0% 100%;
  --border: 230 15% 23%;
  --input: 230 15% 23%;
  --ring: 262 36% 52%;
}
```

## Usage Rules

- `--bukeer-agent-structural`: selected pane, active rail, focus ring.
- `--bukeer-agent-live`: realtime pulses, streaming cursor, active trace node.
- `--bukeer-agent-human-loop`: approval required, pending hold, unconfirmed operation.
- `--bukeer-agent-approved`: completed safe action.
- `--bukeer-agent-rejected`: rejected or blocked destructive action.
- `--bukeer-agent-warning`: expiring holds, price changes, schedule conflicts.

Do not use primary purple as a universal filled button color.
