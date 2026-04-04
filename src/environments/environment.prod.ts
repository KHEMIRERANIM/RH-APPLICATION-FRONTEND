export const environment = {
  production: true,
  apiUrl: 'http://10.188.81.174:8081/api',
  wsTrackingUrl: '' as string
};

export function getWsTrackingSockJsUrl(): string {
  const explicit = (environment.wsTrackingUrl || '').trim();
  if (explicit) {
    return explicit;
  }
  const api = (environment.apiUrl || '').trim();
  if (api.startsWith('http')) {
    try {
      const origin = new URL(api).origin;
      return `${origin}/ws-tracking`;
    } catch {
      // ignore
    }
  }
  return 'http://127.0.0.1:8081/ws-tracking';
}