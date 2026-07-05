/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Bật instrumentation.ts để tự khởi động scheduler khi server boot.
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "scontent.xx.fbcdn.net" },
      { protocol: "https", hostname: "graph.facebook.com" },
    ],
  },
};

export default nextConfig;
