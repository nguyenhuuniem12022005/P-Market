/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // Cho phép tải ảnh từ các domain ngoài
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001', // Cổng backend của bạn
        pathname: '/uploads/**', // Đường dẫn uploads trên server
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true, // Cho phép hiển thị SVG từ remote
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // Tăng bảo mật
  },
};

module.exports = nextConfig;
