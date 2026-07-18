import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/oefeningen",
        destination: "/leerplan",
        permanent: true,
      },
      {
        source: "/oefeningen/:path*",
        destination: "/leerplan",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
