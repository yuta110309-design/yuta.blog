/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // ページ本体・APIはキャッシュさせない（LINE内蔵ブラウザ等での古い表示対策）
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, max-age=0, must-revalidate' }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
