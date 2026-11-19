<script setup lang="ts">
import type { PostList } from '~/types/blog';

definePageMeta({ layout: 'public' });
useSeoMeta({ title: 'Beranda', description: 'Portofolio dan catatan teknis.' });

const { data: latest } = await useFetch<PostList>('/api/posts', { query: { limit: 3 } });
</script>

<template>
  <div>
    <section class="py-10">
      <h1 class="text-4xl font-bold">
        Halo, saya <span class="text-sky-400">Nama Anda</span>
      </h1>
      <p class="mt-4 max-w-2xl text-lg text-slate-300">
        Tulis perkenalan singkat Anda di sini: bidang yang ditekuni, teknologi yang dipakai, dan hal yang sedang dipelajari.
      </p>
    </section>

    <section class="mt-8">
      <div class="mb-4 flex items-baseline justify-between">
        <h2 class="text-2xl font-semibold">Tulisan terbaru</h2>
        <NuxtLink to="/blog" class="text-sm text-sky-400 hover:underline">Lihat semua</NuxtLink>
      </div>

      <p v-if="!latest?.items.length" class="text-slate-400">Belum ada tulisan.</p>

      <ul v-else class="space-y-4">
        <li v-for="post in latest.items" :key="post.id" class="rounded-xl bg-slate-900 p-5">
          <NuxtLink :to="`/blog/${post.slug}`" class="text-lg font-semibold hover:text-sky-400">
            {{ post.title }}
          </NuxtLink>
          <p class="mt-1 text-sm text-slate-400">{{ formatDate(post.published_at) }}</p>
          <p v-if="post.excerpt" class="mt-2 text-slate-300">{{ post.excerpt }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>
