/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
          // Optional but nice:
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

