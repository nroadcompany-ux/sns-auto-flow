import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / server-only packages out of the client bundle.
  serverExternalPackages: ["@prisma/client", ".prisma/client", "sharp"],
};

export default nextConfig;
