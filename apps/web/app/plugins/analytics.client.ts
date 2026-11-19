export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter();
  let lastPath = '';
  let isFirst = true;

  const track = (path: string) => {
    if (path === lastPath) return;
    lastPath = path;
    if (path === '/login' || path.startsWith('/admin')) return;

    const body: { path: string; referrer?: string } = { path };
    // Referrer hanya untuk kunjungan pertama dari situs luar
    if (isFirst && document.referrer && !document.referrer.startsWith(location.origin)) {
      body.referrer = document.referrer;
    }
    isFirst = false;

    fetch('/api/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  };

  nuxtApp.hook('page:finish', () => track(router.currentRoute.value.path));
});
