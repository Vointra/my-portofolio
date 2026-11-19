type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'user';
};

// Dibagi lintas pemanggilan agar refresh tidak berjalan paralel
let refreshing: Promise<boolean> | null = null;

export function useAuth() {
  const nuxtApp = useNuxtApp();
  const accessToken = useState<string | null>('auth:token', () => null);
  const user = useState<AuthUser | null>('auth:user', () => null);

  const statusOf = (e: any): number | undefined => e?.statusCode ?? e?.response?.status;

  function refresh(): Promise<boolean> {
    if (import.meta.server) return Promise.resolve(false);
    if (!refreshing) {
      refreshing = $fetch<{ accessToken: string }>('/api/auth/refresh', { method: 'POST' })
        .then((r) => {
          accessToken.value = r.accessToken;
          return true;
        })
        .catch(() => {
          accessToken.value = null;
          user.value = null;
          return false;
        })
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  }

  async function authFetch<T = unknown>(url: string, options: Record<string, any> = {}): Promise<T> {
    const send = () =>
      $fetch<T>(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${accessToken.value}` },
      });

    try {
      return await send();
    } catch (e) {
      if (statusOf(e) !== 401) throw e;
      if (!(await refresh())) {
        await nuxtApp.runWithContext(() => navigateTo('/login'));
        throw e;
      }
      return await send();
    }
  }

  async function loadUser() {
    user.value = await authFetch<AuthUser>('/api/auth/me');
  }

  async function login(email: string, password: string) {
    const r = await $fetch<{ accessToken: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    accessToken.value = r.accessToken;
    await loadUser();
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // abaikan: state lokal tetap dibersihkan
    }
    accessToken.value = null;
    user.value = null;
    await nuxtApp.runWithContext(() => navigateTo('/login'));
  }

  // Dipakai middleware: pulihkan sesi (jika perlu) dan pastikan role admin
  async function ensureAuth(): Promise<boolean> {
    if (accessToken.value && user.value) return user.value.role === 'admin';
    if (!accessToken.value && !(await refresh())) return false;
    try {
      await loadUser();
    } catch {
      return false;
    }
    return user.value?.role === 'admin';
  }

  return { accessToken, user, login, logout, refresh, authFetch, ensureAuth };
}
