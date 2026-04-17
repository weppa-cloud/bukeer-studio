/**
 * Lighthouse CI configuration for Bukeer Studio product landing pages.
 *
 * Thresholds come from the Product Landing v1 runbook (docs/ops/product-landing-v1-runbook.md):
 *   - Performance      >= 0.90 (warn)
 *   - Accessibility    >= 0.95 (error)
 *   - SEO              >= 0.95 (error)
 *   - Best Practices   >= 0.90 (warn)
 *
 * PORT is injected via the LHCI_PORT env var (set by scripts/lighthouse-ci.sh
 * after claiming a session pool slot). Never run against :3000 from an agent.
 *
 * Run with:  bash scripts/lighthouse-ci.sh
 */

const PORT = process.env.LHCI_PORT || process.env.PORT || '3001';
const TENANT = process.env.LHCI_TENANT || 'colombiatours';

const baseUrl = `http://localhost:${PORT}`;

module.exports = {
  ci: {
    collect: {
      url: [
        `${baseUrl}/site/${TENANT}/actividades/4x1-adventure`,
        `${baseUrl}/site/${TENANT}/hoteles/aloft-bogota-airport`,
        `${baseUrl}/site/${TENANT}/paquetes/paquete-bogot-4-d-as`,
      ],
      numberOfRuns: 2,
      // Server is started separately via scripts/lighthouse-ci.sh using the
      // session pool. Leaving this undefined prevents LHCI from trying to
      // spawn its own server on a hardcoded port.
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
      outputDir: '.lighthouseci',
    },
  },
};
