import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogService } from '../services/blogService';
import { toast } from 'sonner';
import type { BlogPost } from '../types/blog';

export const useBlog = () => {
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ['blog_posts'],
    queryFn: blogService.getPosts,
  });

  const categoriesQuery = useQuery({
    queryKey: ['blog_categories'],
    queryFn: blogService.getCategories,
  });

  const addCategoryMutation = useMutation({
    mutationFn: (name: string) => blogService.addCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_categories'] });
      toast.success('Catégorie ajoutée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => blogService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_categories'] });
      toast.success('Catégorie supprimée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const addPostMutation = useMutation({
    mutationFn: (post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) =>
      blogService.addPost(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
      toast.success('Article créé');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BlogPost> }) =>
      blogService.updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
      toast.success('Article mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => blogService.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
      toast.success('Article supprimé');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    posts: postsQuery.data || [],
    categories: categoriesQuery.data || [],
    isLoadingPosts: postsQuery.isLoading,
    isLoadingCategories: categoriesQuery.isLoading,
    addCategory: addCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    addPost: addPostMutation.mutateAsync,
    updatePost: updatePostMutation.mutateAsync,
    deletePost: deletePostMutation.mutateAsync,
  };
};
