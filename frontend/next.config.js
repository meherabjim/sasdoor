/** @type {import('next').NextConfig} */

// Admin-uploaded pictures are served by the backend, so Next has to be told that host
// is allowed. It was easier to switch optimisation off altogether - but that shipped
// every photo at full size to every visitor, on every page.
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const api = new URL(apiBase);

const nextConfig = {

  // Next walks up the folders looking for a lockfile to decide where the project starts.
  // If a stray package-lock.json is sitting higher up - one left behind in the home folder
  // is enough - it picks that instead, warns, and then works from the wrong place. In dev
  // that is only noise; on build it can trace the wrong files, and under Turbopack a
  // misdetected root has been known to send module resolution chasing its own tail.
  //
  // Two keys, because Next reads two: file tracing on build uses `outputFileTracingRoot`,
  // and module resolution uses `turbopack.root`. Setting only the one the warning names
  // leaves the other still guessing. Both point here, so it no longer matters what is
  // lying around above this folder or where the project gets unzipped.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },

  allowedDevOrigins: [
    "192.168.56.1",
  ],

  images: {
    remotePatterns: [
      {
        protocol: api.protocol.replace(":", ""),
        hostname: api.hostname,
        port: api.port || "",
        pathname: "/uploads/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

};

module.exports = nextConfig;
