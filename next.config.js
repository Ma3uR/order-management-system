/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
};

import withNextIntl from 'next-intl/plugin';

export default withNextIntl('./i18n.ts')(nextConfig);
