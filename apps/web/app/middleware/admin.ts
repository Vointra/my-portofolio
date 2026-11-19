export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return;
  const { ensureAuth } = useAuth();
  if (!(await ensureAuth())) return navigateTo('/login');
});
