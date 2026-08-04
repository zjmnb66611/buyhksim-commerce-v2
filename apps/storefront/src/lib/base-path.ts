const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim().replace(/\/$/, "") || "";

export function publicAsset(path: string): string {
  if (!configuredBasePath || !path.startsWith("/") || path.startsWith(`${configuredBasePath}/`)) {
    return path;
  }

  return `${configuredBasePath}${path}`;
}
