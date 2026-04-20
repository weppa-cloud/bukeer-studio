/**
 * Lighthouse CI configuration for EPIC #214 W6 #220 — pilot detail URLs.
 *
 * Four URLs covered: package / activity / hotel / blog — driven by the pilot
 * seed factory (`e2e/setup/pilot-seed.ts`, variants `baseline` +
 * `translation-ready`). Thresholds aligned with `lighthouserc.js` (desktop
 * baseline). Mobile forking decision gate = ADR-026 (conditional).
 *
 * Entry point: `bash scripts/lighthouse-pilot.sh`.
 */

const PORT = process.env.LHCI_PORT || process.env.PORT || '3001';
const TENANT = process.env.LHCI_TENANT || 'colombiatours';
const OUTPUT_DIR = process.env.LHCI_OUTPUT_DIR || '.lighthouseci';

const baseUrl = `http://localhost:${PORT}`;

module.exports = {
  ci: {
    collect: {
      url: [
        `${baseUrl}/site/${TENANT}/paquetes/pilot-colombiatours-pkg-baseline`,
        `${baseUrl}/site/${TENANT}/actividades/pilot-colombiatours-act-baseline`,
        `${baseUrl}/site/${TENANT}/hoteles/aloft-bogota-airport`,
        `${baseUrl}/site/${TENANT}/blog/pilot-colombiatours-blog-translation-ready`,
      ],
      numberOfRuns: 2,
      startServerCommand: undefined,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: OUTPUT_DIR,
    },
  },
};
