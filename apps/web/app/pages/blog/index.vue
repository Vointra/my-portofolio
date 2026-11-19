<script setup lang="ts">
import type { Category, PostList, TagCount } from '~/types/blog';

definePageMeta({ layout: 'public' });
useSeoMeta({ title: 'Blog', description: 'Tulisan dan catatan teknis.' });

const LIMIT = 6;
const route = useRoute();

const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const category = computed(() => (route.query.category as string) || undefined);
const tag = computed(() => (route.query.tag as string) || undefined);

const { data: posts } = await useFetch<PostList>('/api/posts', {
  query: { page, limit: LIMIT, category, tag },
});
const { data: categories } = await useFetch<Category[]>('/api/categories');
const { data: tags } = await useFetch<TagCount[]>('/api/tags');

const totalPages = computed(() => Math.max(1, Math.ceil((posts.value?.total ?? 0) / LIMIT)));
const activeCategories = computed(() => (categories.value ?? []).filter((c) => c.post_count > 0));
const activeTags = computed(() => (tags.value ?? []).filter((t) => t.post_count > 0));

// Bangun tautan /blog dengan query saat ini, lalu timpa sebagian
const to = (override: Record<string, string | number | undefined>) => {
  const merged: Record<string, string | number | undefined> = {
    category: category.value,
    tag: tag.value,
    ...override,
  };
  const query = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined && v !== ''));
  return { path: '/blog', query };
};

const chip = (active: boolean) =>
  active ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700';
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold">Blog</h1>

    <div v-if="activeCategories.length || activeTags.length" class="mt-6 space-y-3">
      <div v-if="activeCategories.length" class="flex flex-wrap items-center gap-2">
        <span class="text-sm text-slate-400">Kategori:</span>
        <NuxtLink
          v-for="c in activeCategories"
          :key="c.id"
          :to="to({ category: category === c.slug ? undefined : c.slug, page: undefined })"
          class="rounded-full px-3 py-1 text-sm"
          :class="chip(category === c.slug)"
        >
          {{ c.name }} ({{ c.post_count }})
        </NuxtLink>
      </div>

      <div v-if="activeTags.length" class="flex flex-wrap items-center gap-2">
        <span class="text-sm text-slate-400">Tag:</span>
        <NuxtLink
          v-for="t in activeTags"
          :key="t.id"
          :to="to({ tag: tag === t.slug ? undefined : t.slug, page: undefined })"
          class="rounded-full px-3 py-1 text-sm"
          :class="chip(tag === t.slug)"
        >
          {{ t.name }}
        </NuxtLink>
      </div>
    </div>

    <p v-if="!posts?.items.length" class="mt-10 text-slate-400">Tidak ada tulisan yang cocok.</p>

    <ul v-else class="mt-8 space-y-4">
      <li v-for="post in posts.items" :key="post.id" class="rounded-xl bg-slate-900 p-5">
        <NuxtLink :to="`/blog/${post.slug}`" class="text-xl font-semibold hover:text-sky-400">
          {{ post.title }}
        </NuxtLink>
        <p class="mt-1 text-sm text-slate-400">
          {{ formatDate(post.published_at) }}
          <span v-if="post.category_name"> &middot; {{ post.category_name }}</span>
        </p>
        <p v-if="post.excerpt" class="mt-2 text-slate-300">{{ post.excerpt }}</p>
        <div v-if="post.tags.length" class="mt-3 flex flex-wrap gap-2">
          <NuxtLink
            v-for="t in post.tags"
            :key="t.id"
            :to="to({ tag: t.slug, page: undefined })"
            class="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
          >
            #{{ t.name }}
          </NuxtLink>
        </div>
      </li>
    </ul>

    <nav v-if="totalPages > 1" class="mt-8 flex items-center justify-between text-sm">
      <NuxtLink
        v-if="page > 1"
        :to="to({ page: page - 1 })"
        class="rounded-md bg-slate-800 px-4 py-2 hover:bg-slate-700"
      >
        Sebelumnya
      </NuxtLink>
      <span v-else />
      <span class="text-slate-400">Halaman {{ page }} dari {{ totalPages }}</span>
      <NuxtLink
        v-if="page < totalPages"
        :to="to({ page: page + 1 })"
        class="rounded-md bg-slate-800 px-4 py-2 hover:bg-slate-700"
      >
        Berikutnya
      </NuxtLink>
      <span v-else />
    </nav>
  </div>
</template>
