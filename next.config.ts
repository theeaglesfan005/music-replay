import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_MODE === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  ...(isStaticExport && {
    output: "export",
    basePath: basePath || undefined,
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;
