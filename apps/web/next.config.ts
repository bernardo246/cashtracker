import type { NextConfig } from "next";

export function buildRewrites(apiUrl: string | undefined) {
  if (!apiUrl) {
    throw new Error("API_URL não definida: o Next precisa dela para reescrever /api/* para a API.");
  }
  return [{ source: "/api/:path*", destination: `${apiUrl.replace(/\/+$/, "")}/:path*` }];
}

const nextConfig: NextConfig = {
  transpilePackages: ["@cash/shared"],
  agentRules: false,
  rewrites() {
    return Promise.resolve(buildRewrites(process.env.API_URL));
  },
  headers() {
    return Promise.resolve([
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]);
  },
};

export default nextConfig;
