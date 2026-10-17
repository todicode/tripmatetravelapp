export function realtimeUrl(baseUrl: string): string {
  // Native URL does not support assigning protocol or resolving a root-relative path.
  const origin = new URL(baseUrl).origin;
  if (!/^https?:\/\/[^/?#@]+$/.test(origin) || /^https?:\/\/[^/?#]*@/.test(baseUrl)) {
    throw new Error('Backend API URL must have an HTTP or HTTPS origin.');
  }
  return `${origin.replace(/^http/, 'ws')}/ws`;
}
