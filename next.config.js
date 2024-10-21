const withNextIntl = require('next-intl/plugin')('./i18n.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add any other Next.js config options here
}

module.exports = withNextIntl(nextConfig);
