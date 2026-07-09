import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.163"],
  experimental: {
    typedEnv: true
  }
};

export default nextConfig;
