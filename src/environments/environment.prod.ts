export const environment = {
  production: true,
  apiUrl: 'http://10.252.246.174:8081/api',
  wsTrackingUrl: '' as string,
  pexelsApiKey: 'qP5hpgaZsBhnzJH3LFh60cTDNcpdaslYfYXxZnLt3W5L0hzvUg1PzVBT'
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