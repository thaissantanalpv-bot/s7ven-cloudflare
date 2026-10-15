export function shouldRegisterOffline({ production, embedded, hostname, disabled }: { production: boolean; embedded: boolean; hostname: string; disabled: boolean }) {
  return production && !embedded && !disabled && !/^(id-preview--|preview--)/.test(hostname) && !['lovableproject.com', 'lovableproject-dev.com', 'beta.lovable.dev'].some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
}
export async function registerCatalogOffline() {
  if (!('serviceWorker' in navigator)) return;
  const allowed = shouldRegisterOffline({ production: import.meta.env.PROD, embedded: window.self !== window.top, hostname: location.hostname, disabled: new URLSearchParams(location.search).get('sw') === 'off' });
  if (!allowed) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(registration => [registration.active, registration.waiting, registration.installing].some(worker => worker && new URL(worker.scriptURL).pathname === '/sw.js')).map(registration => registration.unregister()));
    return;
  }
  const registration = await navigator.serviceWorker.register('/sw.js');
  // Cache the first public navigation once the generated worker controls it.
  if (location.pathname === '/') {
    void navigator.serviceWorker.ready.then(async () => {
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
      }
      if (navigator.onLine) await fetch('/', { credentials: 'omit' });
    }).catch(() => {});
  }
  const update = () => { if (navigator.onLine) void registration.update().catch(() => {}); };
  window.addEventListener('online', update);
  update();
}
