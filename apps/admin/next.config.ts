import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim().replace(/\/$/, "") || "";
const apiOrigin=(()=>{try{return new URL(process.env.NEXT_PUBLIC_API_BASE_URL??"http://127.0.0.1:4000").origin}catch{return "http://127.0.0.1:4000"}})();
const assetOrigin=(()=>{try{return process.env.NEXT_PUBLIC_ASSET_ORIGIN?new URL(process.env.NEXT_PUBLIC_ASSET_ORIGIN).origin:""}catch{return ""}})();
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${assetOrigin ? ` ${assetOrigin}` : ""}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} http://127.0.0.1:4000 http://localhost:4000`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const config: NextConfig = {
  basePath,
  output: isStaticExport ? "export" : undefined,
  trailingSlash: isStaticExport,
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["@phosphor-icons/react"] },
  images: { unoptimized: isStaticExport || Boolean(assetOrigin) },
  headers: isStaticExport
    ? undefined
    : async () => [{ source: "/(.*)", headers: securityHeaders }],
};

export default config;
