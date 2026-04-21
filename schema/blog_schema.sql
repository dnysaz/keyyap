-- MEGA SCRIPT: KeyYap Blog Schema Sync
-- Script ini aman dijalankan berulang kali (Idempotent)

-- 1. Pastikan tabel blogs ada
CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    image_url TEXT,
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tambahkan kolom status dan hashtags (Gunakan DO block agar tidak error jika sudah ada)
DO $$ 
BEGIN 
    -- Tambah Hashtags
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'blogs' AND COLUMN_NAME = 'hashtags') THEN
        ALTER TABLE public.blogs ADD COLUMN hashtags TEXT[] DEFAULT '{}';
    END IF;

    -- Tambah Status
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'blogs' AND COLUMN_NAME = 'status') THEN
        ALTER TABLE public.blogs ADD COLUMN status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));
    END IF;

    -- Tambah View Count
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'blogs' AND COLUMN_NAME = 'views') THEN
        ALTER TABLE public.blogs ADD COLUMN views INTEGER DEFAULT 0;
    END IF;

    -- Tambah Share Count
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'blogs' AND COLUMN_NAME = 'shares') THEN
        ALTER TABLE public.blogs ADD COLUMN shares INTEGER DEFAULT 0;
    END IF;

    -- Update Batas Karakter Konten (Hapus constraint lama jika ada)
    ALTER TABLE public.blogs ALTER COLUMN content TYPE TEXT;
    ALTER TABLE public.blogs DROP CONSTRAINT IF EXISTS blogs_content_check;
    ALTER TABLE public.blogs ADD CONSTRAINT blogs_content_check CHECK (char_length(content) <= 10000);
END $$;

-- 3. Sinkronisasi Tabel Comments (Link ke Blog)
DO $$ 
BEGIN 
    -- Tambah Blog ID dengan CASCADE agar bisa dihapus
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'comments' AND COLUMN_NAME = 'blog_id') THEN
        ALTER TABLE public.comments ADD COLUMN blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE;
    ELSE
        -- Jika sudah ada, pastikan punya ON DELETE CASCADE
        ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_blog_id_fkey;
        ALTER TABLE public.comments ADD CONSTRAINT comments_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;
    END IF;

    -- 3a. Tabel untuk Statistik Riwayat (Agar Grafik Real)
    CREATE TABLE IF NOT EXISTS public.blog_stats (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE,
        view_date DATE DEFAULT CURRENT_DATE,
        view_count INTEGER DEFAULT 0
    );

    -- Paksa penambahan constraint unik jika terlewat (penting untuk upsert RPC)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'blog_stats_blog_id_view_date_key'
    ) THEN
        ALTER TABLE public.blog_stats ADD CONSTRAINT blog_stats_blog_id_view_date_key UNIQUE(blog_id, view_date);
    END IF;
    
    -- Pastikan RLS dimatikan atau izinkan akses agar Dashboard bisa baca graph
    ALTER TABLE public.blog_stats ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public can view blog stats" ON public.blog_stats;
    CREATE POLICY "Public can view blog stats" ON public.blog_stats FOR SELECT USING (true);
    
    -- Tambah Parent ID secara terpisah
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'comments' AND COLUMN_NAME = 'parent_id') THEN
        ALTER TABLE public.comments ADD COLUMN parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
    END IF;

    -- IZINKAN post_id MENJADI NULL (PENTING untuk sistem blog)
    ALTER TABLE public.comments ALTER COLUMN post_id DROP NOT NULL;

    -- Constraint: Komentar hanya boleh ke Post ATAU Blog
    ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_target_check;
    ALTER TABLE public.comments ADD CONSTRAINT comments_target_check 
        CHECK (
            (post_id IS NOT NULL AND blog_id IS NULL) OR 
            (post_id IS NULL AND blog_id IS NOT NULL)
        );
END $$;

-- 4. Aktifkan RLS dan Sinkronisasi Policy
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Reset Policies
DROP POLICY IF EXISTS "Public blogs are viewable by everyone" ON public.blogs;
CREATE POLICY "Public blogs are viewable by everyone" ON public.blogs
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Authors can view all their own blogs" ON public.blogs;
CREATE POLICY "Authors can view all their own blogs" ON public.blogs
    FOR SELECT USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Admins can manage blogs" ON public.blogs;
CREATE POLICY "Admins can manage blogs" ON public.blogs
    FOR ALL USING (auth.uid() = author_id);

-- 5. Indeks Performa
CREATE INDEX IF NOT EXISTS blogs_slug_idx ON public.blogs (slug);
CREATE INDEX IF NOT EXISTS blogs_status_idx ON public.blogs (status);
CREATE INDEX IF NOT EXISTS comments_blog_id_idx ON public.comments (blog_id);

-- 6. Trigger Update Timestamp
CREATE OR REPLACE FUNCTION update_blogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_blogs_timestamp ON public.blogs;
CREATE TRIGGER update_blogs_timestamp
    BEFORE UPDATE ON public.blogs
    FOR EACH ROW
    EXECUTE FUNCTION update_blogs_updated_at();

-- 7. Fungsi RPC untuk Increment Views (Aman & Mencatat Riwayat)
DROP FUNCTION IF EXISTS increment_blog_views(UUID);
CREATE OR REPLACE FUNCTION increment_blog_views(p_blog_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update total views
    UPDATE public.blogs
    SET views = COALESCE(views, 0) + 1
    WHERE id = p_blog_id;

    -- Mencatat riwayat harian untuk grafik dashboard
    INSERT INTO public.blog_stats (blog_id, view_date, view_count)
    VALUES (p_blog_id, CURRENT_DATE, 1)
    ON CONFLICT (blog_id, view_date)
    DO UPDATE SET view_count = public.blog_stats.view_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Fungsi RPC untuk Increment Shares
DROP FUNCTION IF EXISTS increment_blog_shares(UUID);
CREATE OR REPLACE FUNCTION increment_blog_shares(p_blog_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.blogs
    SET shares = COALESCE(shares, 0) + 1
    WHERE id = p_blog_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Sinkronisasi Storage Storage (Bucket Blogs)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blogs', 'blogs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access to Blog Images" ON storage.objects;
CREATE POLICY "Public Access to Blog Images" ON storage.objects 
    FOR SELECT USING ( bucket_id = 'blogs' );

DROP POLICY IF EXISTS "Admin Manage Blog Images" ON storage.objects;
CREATE POLICY "Admin Manage Blog Images" ON storage.objects 
    FOR ALL USING ( bucket_id = 'blogs' AND auth.role() = 'authenticated' );
