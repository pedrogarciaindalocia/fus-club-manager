export interface BlogCategory {
  id: string;
  name: string;
  created_at?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  category?: BlogCategory;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
}

export type BlogPostStatus = 'draft' | 'published';
