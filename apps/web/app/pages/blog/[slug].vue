<script setup lang="ts">
import type { PostDetail } from '~/types/blog';

definePageMeta({ layout: 'public' });

const route = useRoute();
const slug = encodeURIComponent(route.params.slug as string);

const { data: post, error } = await useFetch<PostDetail>(`/api/posts/${slug}`);

if (error.value || !post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Tulisan tidak ditemukan', fatal: true });
}

// Aman: markdown-it dikonfigurasi html:false, jadi HTML mentah tidak diteruskan
const html = computed(() => renderMarkdown(post.value!.content));

useSeoMeta({
  title: post.value.title,
  description: post.value.excerpt ?? undefined,
  ogTitle: post.value.title,
  ogDescription: post.value.excerpt ?? undefined,
});
</script>

<template>
  <article v-if="post">
    <NuxtLink to="/blog" class="text-sm text-sky-400 hover:underline">&larr; Kembali ke blog</NuxtLink>

    <h1 class="mt-4 text-3xl font-bold">{{ post.title }}</h1>
    <p class="mt-2 text-sm text-slate-400">
      {{ formatDate(post.published_at) }}
      <span v-if="post.category_name"> &middot; {{ post.category_name }}</span>
    </p>

    <div v-if="post.tags.length" class="mt-3 flex flex-wrap gap-2">
      <NuxtLink
        v-for="t in post.tags"
        :key="t.id"
        :to="{ path: '/blog', query: { tag: t.slug } }"
        class="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
      >
        #{{ t.name }}
      </NuxtLink>
    </div>

    <div class="prose prose-invert mt-8 max-w-none" v-html="html" />
  </article>
</template>
