<script setup lang="ts">
definePageMeta({ middleware: 'admin' });

type Summary = { totals: { pageviews: number; dailyUniqueVisitors: number } };

const { user, logout, authFetch } = useAuth();
const summary = ref<Summary | null>(null);
const error = ref('');

onMounted(async () => {
  try {
    summary.value = await authFetch<Summary>('/api/admin/analytics/summary?days=7');
  } catch {
    error.value = 'Gagal memuat ringkasan';
  }
});
</script>

<template>
  <main class="min-h-screen bg-slate-950 p-6 text-slate-100">
    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Dashboard Admin</h1>
        <p class="text-sm text-slate-400">{{ user?.display_name }} ({{ user?.email }}), role: {{ user?.role }}</p>
      </div>
      <button class="rounded-md bg-slate-800 px-4 py-2 hover:bg-slate-700" @click="logout()">Logout</button>
    </header>

    <p v-if="error" class="text-red-400" role="alert">{{ error }}</p>

    <section v-if="summary" class="grid max-w-md grid-cols-2 gap-4">
      <div class="rounded-xl bg-slate-900 p-4">
        <p class="text-sm text-slate-400">Pageviews (7 hari)</p>
        <p class="text-3xl font-bold">{{ summary.totals.pageviews }}</p>
      </div>
      <div class="rounded-xl bg-slate-900 p-4">
        <p class="text-sm text-slate-400">Pengunjung unik harian</p>
        <p class="text-3xl font-bold">{{ summary.totals.dailyUniqueVisitors }}</p>
      </div>
    </section>
  </main>
</template>
