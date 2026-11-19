<script setup lang="ts">
const { login } = useAuth();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await login(email.value, password.value);
    await navigateTo('/admin');
  } catch (e: any) {
    const code = e?.statusCode ?? e?.response?.status;
    error.value =
      code === 401
        ? 'Email atau password salah'
        : code === 429
          ? 'Terlalu banyak percobaan, coba lagi sebentar'
          : 'Terjadi kesalahan, coba lagi';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
    <form class="w-full max-w-sm space-y-4 rounded-xl bg-slate-900 p-6 shadow-lg" @submit.prevent="onSubmit">
      <h1 class="text-xl font-semibold">Login Admin</h1>

      <div>
        <label for="email" class="mb-1 block text-sm text-slate-300">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="username"
          class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:border-sky-500"
        />
      </div>

      <div>
        <label for="password" class="mb-1 block text-sm text-slate-300">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:border-sky-500"
        />
      </div>

      <p v-if="error" class="text-sm text-red-400" role="alert">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-md bg-sky-600 py-2 font-medium hover:bg-sky-500 disabled:opacity-50"
      >
        {{ loading ? 'Memproses...' : 'Masuk' }}
      </button>
    </form>
  </main>
</template>
