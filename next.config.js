/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/news/process": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

module.exports = nextConfig
