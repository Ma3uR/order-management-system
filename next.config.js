/** @type {import('next').NextConfig} */
const nextConfig = {};

const withNextIntl = require('next-intl/plugin');

module.exports = withNextIntl('./i18n.ts')(nextConfig);
