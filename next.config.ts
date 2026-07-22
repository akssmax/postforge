import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/designs",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
