/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.2"],
  serverExternalPackages: ["jose"],
};

module.exports = nextConfig;
