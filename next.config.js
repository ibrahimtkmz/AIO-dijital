/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/news/process": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

module.exports = nextConfig
