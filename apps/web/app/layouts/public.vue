<script setup lang="ts">
const route = useRoute();
const nav = [
  { to: '/', label: 'Beranda' },
  { to: '/blog', label: 'Blog' },
];
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to));
const year = new Date().getFullYear();
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-950 text-slate-100">
    <header class="border-b border-slate-800">
      <nav class="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <NuxtLink to="/" class="text-lg font-semibold">Portofolio</NuxtLink>
        <ul class="flex gap-6 text-sm">
          <li v-for="item in nav" :key="item.to">
            <NuxtLink
              :to="item.to"
              :class="isActive(item.to) ? 'text-sky-400' : 'text-slate-300 hover:text-white'"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <slot />
    </main>

    <footer class="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
      &copy; {{ year }} Portofolio
    </footer>
  </div>
</template>
