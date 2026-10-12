import type { NextConfig } from "next";

/** Old Spanish URLs keep working. */
const LEGACY_SLUGS: Record<string, string> = {
  "contador-simple": "state-counter",
  "todo-list-basico": "lists-and-keys",
  "renderizado-condicional": "conditional-rendering",
  "cronometro-fantasma": "effects-cleanup",
  "fetching-robusto": "robust-data-fetching",
  "refactor-custom-hook": "custom-hooks",
  "context-theme-switcher": "context-theme-switcher",
  "formularios-controlados": "controlled-forms",
  "useref-dom-focus": "useref-dom-and-persistence",
  "usereducer-undo-redo": "usereducer-undo-redo",
  "elevacion-de-estado": "lifting-state",
  "performance-list-memo": "performance-memoization",
};

const nextConfig: NextConfig = {
  devIndicators: false,

  async redirects() {
    return [
      ...Object.entries(LEGACY_SLUGS).map(([from, to]) => ({
        source: `/ejercicios/${from}`,
        destination: `/exercises/${to}`,
        permanent: true,
      })),
      { source: "/ejercicios/:path*", destination: "/", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
