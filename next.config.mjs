/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Market-data secrets live only in server env; never NEXT_PUBLIC_*.
  env: {},
};
export default nextConfig;
