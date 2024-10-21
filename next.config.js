/** @type {import('next').NextConfig} */
const nextConfig = {};

const withNextIntl = async () => {
  const { default: createNextIntlPlugin } = await import('next-intl/plugin');
  return createNextIntlPlugin('./i18n.ts')(nextConfig);
};

module.exports = withNextIntl();
