import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@meruveda/shared"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pfklokcgcppdmrqgukmr.supabase.co',
      },
    ],
  },
};

export default nextConfig;
