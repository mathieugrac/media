import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Augmenter la limite de taille pour les données passées au client
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
