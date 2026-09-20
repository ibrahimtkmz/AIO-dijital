/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@remotion/vercel",
    "@remotion/renderer",
    "remotion",
  ],
  outputFileTracingIncludes: {
    "/api/news/process": ["./remotion-build/**/*"],
  },
};

module.exports = nextConfig;
