import React, { useState, useMemo, useRef } from 'react';
import { useBlog } from '../../hooks/useBlog';
import { storageService } from '../../services/storageService';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  FilePlus,
  Search,
  Trash2,
  Edit2,
  X,
  Plus,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  Tag,
  Calendar,
  Clock,
  Save,
  Send,
  Sparkles,
  FolderOpen,
  Image as ImageIcon,
  Upload,
  Zap,
  Newspaper,
  CheckCircle2,
  FileEdit,
  LayoutList,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { BlogPost } from '../../types/blog';
import { FusLogoLoader } from '../../components/ui/FusLogoLoader';
import { toast } from 'sonner';
import { MediaPickerModal } from '../media-management/components/MediaPickerModal';

const FOOTBALL_CATEGORIES = [
  'Actualités Club',
  'Matchs & Résultats',
  'Transferts & Mercato',
  'Entraînements',
  'Formations & Tactiques',
  'Jeunes & Académie',
  'Interviews & Conférences',
  'Blessures & Santé',
  'Coupes & Compétitions',
  'Histoire du Club',
  'Communiqués Officiels',
  'Fan Zone',
];

const BlogManagement: React.FC = () => {
  const {
    posts,
    categories,
    isLoadingPosts,
    isLoadingCategories,
    addCategory,
    deleteCategory,
    addPost,
    updatePost,
    deletePost,
  } = useBlog();

  const isLoading = isLoadingPosts || isLoadingCategories;

  type NewsTab = 'all' | 'published' | 'draft' | 'category';
  const [activeTab, setActiveTab]         = useState<NewsTab>('all');
  const [searchQuery, setSearchQuery]     = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const statusFilter: 'ALL' | 'draft' | 'published' =
    activeTab === 'published' ? 'published' :
    activeTab === 'draft'     ? 'draft' : 'ALL';
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('list');
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [seedingCategories, setSeedingCategories] = useState(false);

  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: '',
    content: '',
    category_id: '',
    status: 'draft',
    image_url: null,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesSearch =
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || p.category_id === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [posts, searchQuery, statusFilter, categoryFilter]);

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPosts.slice(start, start + pageSize);
  }, [filteredPosts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPosts.length / pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, categoryFilter, pageSize]);

  const handleOpenAdd = () => {
    setSelectedPost(null);
    setFormData({
      title: '',
      content: '',
      category_id: '',
      status: 'draft',
      image_url: null,
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = await storageService.uploadFile(file, 'blog');
      setFormData({ ...formData, image_url: imageUrl });
      toast.success('Image uploadée');
    } catch (error: any) {
      toast.error(`Erreur upload: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: null });
  };

  const handleOpenEdit = (post: BlogPost) => {
    setSelectedPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      category_id: post.category_id || '',
      status: post.status,
      image_url: post.image_url || null,
    });
    setShowForm(true);
  };

  const handleSave = async (publish = false) => {
    const payload: any = {
      ...formData,
      status: publish ? 'published' : formData.status,
    };

    if (selectedPost) {
      const { id, created_at, updated_at, category, ...updateData } = payload as any;
      await updatePost({ id: selectedPost.id, data: updateData });
    } else {
      await addPost(payload as Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>);
    }
    setShowForm(false);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName.trim());
    setNewCategoryName('');
  };

  const handleSeedCategories = async () => {
    setSeedingCategories(true);
    const existingNames = new Set(categories.map((c) => c.name.toLowerCase()));
    const toAdd = FOOTBALL_CATEGORIES.filter((n) => !existingNames.has(n.toLowerCase()));
    try {
      for (const name of toAdd) {
        await addCategory(name);
      }
      toast.success(`${toAdd.length} catégorie(s) ajoutée(s)`);
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`);
    } finally {
      setSeedingCategories(false);
    }
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <FusLogoLoader fullPage size="lg" label="Chargement des articles du blog…" />;
  }

  return (
    <div className="space-y-8 pb-20 overflow-visible">
        {!showForm ? (
          <div
            key="list"
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground uppercase italic flex items-center gap-2">
                  Blog <Sparkles className="w-6 h-6 text-primary" />
                </h2>
                <p className="text-muted-foreground text-sm font-medium">
                  Rédigez vos articles et gérez les catégories
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-secondary/30 p-1 rounded-2xl border ml-auto">
                  <Button
                    variant={displayMode === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setDisplayMode('list')}
                    className="w-10 h-10 rounded-xl"
                  >
                    <ListIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={displayMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setDisplayMode('grid')}
                    className="w-10 h-10 rounded-xl"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={() => setShowCategoryModal(true)}
                  variant="outline"
                  className="gap-2 h-11 px-4 font-bold uppercase tracking-widest text-xs"
                >
                  <Tag className="w-4 h-4" />
                  Catégories
                </Button>
                <Button
                  onClick={handleOpenAdd}
                  className="gap-2 shadow-lg shadow-primary/20 h-11 px-6 font-bold uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  <FilePlus className="w-4 h-4" />
                  Nouvel Article
                </Button>
              </div>
            </div>

            {/* ── Tab bar ── */}
            <div className="flex items-end gap-1 border-b">
              {([
                { key: 'all',       label: 'Toutes les news',  icon: Newspaper,    count: posts.length },
                { key: 'published', label: 'Publiées',         icon: CheckCircle2, count: posts.filter(p => p.status === 'published').length },
                { key: 'draft',     label: 'Brouillons',       icon: FileEdit,     count: posts.filter(p => p.status === 'draft').length },
                { key: 'category',  label: 'Par catégorie',    icon: LayoutList,   count: null },
              ] as { key: NewsTab; label: string; icon: React.ElementType; count: number | null }[]).map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); if (key !== 'category') setCategoryFilter('ALL'); }}
                  className={`flex items-center gap-2 px-5 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${
                    activeTab === key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {count !== null && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                      activeTab === key ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}>{count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Toolbar: search + category select ── */}
            <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-white border shadow-sm">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-secondary/30 border-transparent focus:bg-white transition-all rounded-xl font-medium"
                />
              </div>
              {(activeTab === 'category' || activeTab === 'all') && categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-11 px-4 rounded-xl bg-secondary/30 border-transparent text-sm font-medium focus:bg-white transition-all shrink-0"
                >
                  <option value="ALL">Toutes les catégories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {displayMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedPosts.map((post) => (
                    <div
                      key={post.id}
                      className="group"
                    >
                      <Card className="h-full rounded-[2rem] border bg-white overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                        <CardContent className="p-6 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <Badge
                              className={`text-[10px] font-black uppercase tracking-widest ${
                                post.status === 'published'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              }`}
                            >
                              {post.status === 'published' ? 'Publié' : 'Brouillon'}
                            </Badge>
                            {post.category && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-black uppercase tracking-widest"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {post.category.name}
                              </Badge>
                            )}
                          </div>

                          {post.image_url && (
                            <div className="mb-4 rounded-xl overflow-hidden aspect-video bg-secondary/30">
                              <img
                                src={post.image_url}
                                alt={post.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <h3 className="font-bold text-lg mb-2 line-clamp-2">{post.title}</h3>
                          <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                            {post.content}
                          </p>

                          <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDateTime(post.created_at)}
                            </span>
                            {post.published_at && (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <Send className="w-3 h-3" />
                                {formatDateTime(post.published_at)}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2 pt-4 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(post)}
                              className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Modifier
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePost(post.id)}
                              className="rounded-xl text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="rounded-2xl border bg-white hover:shadow-md transition-all"
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {post.image_url && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-secondary/30">
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <Badge
                        className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${
                          post.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}
                      >
                        {post.status === 'published' ? 'Publié' : 'Brouillon'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{post.title}</h3>
                        <p className="text-muted-foreground text-sm truncate">{post.content}</p>
                      </div>
                      {post.category && (
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest shrink-0">
                          <Tag className="w-3 h-3 mr-1" />
                          {post.category.name}
                        </Badge>
                      )}
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0 hidden sm:block">
                        {formatDateTime(post.created_at)}
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(post)}
                          className="rounded-xl"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePost(post.id)}
                          className="rounded-xl text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div
            key="form"
            className="max-w-4xl mx-auto"
          >
            <Card className="rounded-[2.5rem] border shadow-lg overflow-hidden bg-white">
              <div className="p-8 border-b bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight uppercase italic">
                      {selectedPost ? 'Modifier' : 'Nouvel'} Article
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                      {selectedPost ? 'Mettez à jour votre contenu' : 'Rédigez et choisissez une catégorie'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Titre
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Titre de l'article"
                    className="h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-white transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <Tag className="w-3 h-3" /> Catégorie
                    </label>
                    <select
                      value={formData.category_id || ''}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value || null })}
                      className="w-full h-12 px-4 rounded-xl bg-secondary/30 border-transparent focus:bg-white transition-all font-medium"
                    >
                      <option value="">Sans catégorie</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Statut
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full h-12 px-4 rounded-xl bg-secondary/30 border-transparent focus:bg-white transition-all font-medium"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="published">Publié</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Image de l'article
                  </label>
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="hidden"
                  />
                  {formData.image_url ? (
                    <div className="space-y-2">
                      <div className="relative rounded-2xl overflow-hidden aspect-video bg-secondary/30 max-w-md border border-slate-200 shadow-sm">
                        <img
                          src={formData.image_url}
                          alt="Article"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-md"
                          title="Supprimer l'image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMediaPickerOpen(true)}
                          className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 bg-slate-50 hover:bg-primary/10 border-slate-200 hover:border-primary/40 text-slate-800"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-primary" />
                          <span>Médiathèque</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => imageInputRef.current?.click()}
                          className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 border-slate-200 hover:bg-slate-100 text-slate-700"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Remplacer fichier</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                      <button
                        type="button"
                        onClick={() => setMediaPickerOpen(true)}
                        className="flex-1 h-28 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-2 text-primary font-bold text-xs p-4 cursor-pointer"
                      >
                        <ImageIcon className="w-6 h-6" />
                        <span>Choisir dans la Médiathèque</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Images du Club</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex-1 h-28 rounded-2xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-secondary/30 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50 text-xs font-bold p-4 cursor-pointer"
                      >
                        {uploadingImage ? (
                          <>
                            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <span className="text-xs font-medium">Upload en cours...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-500" />
                            <span>Téléverser fichier</span>
                            <span className="text-[10px] text-muted-foreground font-normal">JPG, PNG, WebP</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Contenu
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Rédigez votre article ici..."
                    rows={12}
                    className="w-full px-4 py-3 rounded-xl bg-secondary/30 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleSave(false)}
                    className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </Button>
                  <Button
                    onClick={() => handleSave(true)}
                    className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/20"
                  >
                    <Send className="w-4 h-4" />
                    {selectedPost?.status === 'published' ? 'Mettre à jour' : 'Publier'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="rounded-[2rem] border shadow-2xl overflow-hidden bg-white">
              <div className="p-6 border-b">
                <h3 className="text-xl font-black tracking-tight uppercase italic flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  Catégories
                </h3>
              </div>
              <div className="p-6 space-y-5">

                {/* ── Seed football categories ── */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Catégories Football par défaut</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{FOOTBALL_CATEGORIES.length} catégories liées au football</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSeedCategories}
                      disabled={seedingCategories || FOOTBALL_CATEGORIES.every((n) => categories.map((c) => c.name.toLowerCase()).includes(n.toLowerCase()))}
                      className="gap-1.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md shadow-primary/20"
                    >
                      {seedingCategories ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      Ajouter tout
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {FOOTBALL_CATEGORIES.map((name) => {
                      const exists = categories.map((c) => c.name.toLowerCase()).includes(name.toLowerCase());
                      return (
                        <span
                          key={name}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            exists
                              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                              : 'bg-secondary/50 text-muted-foreground border-border'
                          }`}
                        >
                          {exists && <span className="mr-1">✓</span>}{name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* ── Add custom category ── */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Nouvelle catégorie personnalisée
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nom de la catégorie"
                      className="h-11 rounded-xl bg-secondary/30 border-transparent focus:bg-white transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <Button onClick={handleAddCategory} className="h-11 rounded-xl px-4">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* ── Existing categories list ── */}
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {categories.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      Aucune catégorie créée
                    </p>
                  ) : (
                    categories.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/30"
                      >
                        <span className="font-medium text-sm">{c.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCategory(c.id)}
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowCategoryModal(false)}
                  className="w-full h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                >
                  Fermer
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Sélecteur de Médias Centralisé */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
        title="Affecter une image depuis la Médiathèque"
      />
    </div>
  );
};

export default BlogManagement;
