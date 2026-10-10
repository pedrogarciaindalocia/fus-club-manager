import { supabase } from '../lib/supabase';
import { getMyClubId } from './_helpers';
import type { BlogCategory, BlogPost } from '../types/blog';

export const blogService = {
  // Categories
  async getCategories(): Promise<BlogCategory[]> {
    const clubId = await getMyClubId();
    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .eq('club_id', clubId)
      .order('name', { ascending: true });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }
    return data || [];
  },

  async addCategory(name: string): Promise<BlogCategory> {
    const clubId = await getMyClubId();
    const { data, error } = await supabase
      .from('blog_categories')
      .insert([{ name, club_id: clubId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('blog_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Posts
  async getPosts(): Promise<BlogPost[]> {
    const clubId = await getMyClubId();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, category:blog_categories(id, name)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }
    return (data || []).map((p: any) => ({
      ...p,
      category: p.category?.[0] || undefined,
    }));
  },

  async getPublishedPosts(): Promise<BlogPost[]> {
    const clubId = await getMyClubId();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, category:blog_categories(id, name)')
      .eq('club_id', clubId)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205') return [];
      throw error;
    }
    return (data || []).map((p: any) => ({
      ...p,
      category: p.category?.[0] || undefined,
    }));
  },

  async addPost(post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>): Promise<BlogPost> {
    const clubId = await getMyClubId();
    const payload: any = {
      club_id: clubId,
      title: post.title,
      content: post.content,
      category_id: post.category_id || null,
      status: post.status,
      published_at: post.status === 'published' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      image_url: post.image_url || null,
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .insert([payload])
      .select('*, category:blog_categories(id, name)')
      .single();

    if (error) throw error;
    return {
      ...data,
      category: data.category?.[0] || undefined,
    };
  },

  async updatePost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
    const payload: any = {
      ...updates,
      category_id: updates.category_id || null,
      updated_at: new Date().toISOString(),
    };

    // Never overwrite club_id on update
    delete payload.club_id;

    // Remove undefined image_url to prevent overwriting with null
    if (updates.image_url === undefined) {
      delete payload.image_url;
    }

    if (updates.status === 'published' && !updates.published_at) {
      payload.published_at = new Date().toISOString();
    } else if (updates.status === 'draft') {
      payload.published_at = null;
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(payload)
      .eq('id', id)
      .select('*, category:blog_categories(id, name)')
      .single();

    if (error) throw error;
    return {
      ...data,
      category: data.category?.[0] || undefined,
    };
  },

  async deletePost(id: string): Promise<void> {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
