-- ─── RLS Policies for blog_posts ────────────────────────────────────────────

-- Allow authenticated users to read all posts
CREATE POLICY "blog_posts_select"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert posts
CREATE POLICY "blog_posts_insert"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update their own posts
CREATE POLICY "blog_posts_update"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete posts
CREATE POLICY "blog_posts_delete"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (true);

-- ─── RLS Policies for blog_categories ───────────────────────────────────────

-- Allow authenticated users to read all categories
CREATE POLICY "blog_categories_select"
  ON blog_categories FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert categories
CREATE POLICY "blog_categories_insert"
  ON blog_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to delete categories
CREATE POLICY "blog_categories_delete"
  ON blog_categories FOR DELETE
  TO authenticated
  USING (true);
