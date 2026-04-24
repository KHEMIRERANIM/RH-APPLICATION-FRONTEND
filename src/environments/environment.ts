export const environment = {
  production: false,
  pexelsApiKey: 'qP5hpgaZsBhnzJH3LFh60cTDNcpdaslYfYXxZnLt3W5L0hzvUg1PzVBT',
  apiUrl: 'http://localhost:8081/api',
  /**
   * URL SockJS optionnelle pour le suivi.
   * Si vide, on calcule automatiquement à partir de l'API (ou de l'origine navigateur en dev).
   */
  wsTrackingUrl: 'http://localhost:8081/ws-tracking'
};

/**
 * URL SockJS pour STOMP (suivi conducteur/navette).
 * En dev (localhost), on retourne /ws-tracking pour bénéficier du proxy Angular.
 */
export function getWsTrackingSockJsUrl(): string {
  const explicit = (environment.wsTrackingUrl || '').trim();
  if (explicit) {
    return explicit;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const h = window.location.hostname;
    const devLocal =
      h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    if (devLocal) {
      return `${window.location.origin}/ws-tracking`;
    }
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

