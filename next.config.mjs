import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Market-data secrets live only in server env; never NEXT_PUBLIC_*.
  env: {},
  // Prevent Next 16 from treating a parent-folder lockfile as the monorepo root
  // (C:\Users\Michael Chapman\pnpm-lock.yaml vs this project's lockfile).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
