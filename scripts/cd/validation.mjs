/** Public, deterministic values only. No credentials or token strings go in source. */
export function assertImageUrl(value) {
  if (typeof value !== 'string' || !/^ghcr\.io\/[a-z0-9][a-z0-9._/-]*:[0-9a-f]{40}$/.test(value)) {
    throw new Error('IMAGE_URL must be a GHCR image tagged with a 40-character commit SHA.');
  }
  return value;
}

export function assertPublicUrl(value, kind) {
  if (typeof value !== 'string') throw new Error(`${kind} URL is missing`);
  let url;
  try { url = new URL(value); } catch { throw new Error(`${kind} URL is invalid`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      url.pathname !== '/' || !url.hostname || url.hostname === 'localhost') {
    throw new Error(`${kind} must be a public HTTPS origin (no path, auth or query)`);
  }
  return url.origin;
}
