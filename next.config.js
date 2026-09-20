/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/news/process": ["./remotion-build/**/*"],
  },
};

module.exports = nextConfig;
