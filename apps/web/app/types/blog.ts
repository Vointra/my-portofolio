export type Tag = { id: number | string; name: string; slug: string };

export type PostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  category_name: string | null;
  category_slug: string | null;
  tags: Tag[];
};

export type PostDetail = PostSummary & { content: string };
export type PostList = { items: PostSummary[]; page: number; limit: number; total: number };
export type Category = { id: string; name: string; slug: string; post_count: number };
export type TagCount = Tag & { post_count: number };
