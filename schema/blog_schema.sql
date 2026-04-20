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

    -- Update Batas Karakter Konten (Hapus constraint lama jika ada)
    ALTER TABLE public.blogs ALTER COLUMN content TYPE TEXT;
    ALTER TABLE public.blogs DROP CONSTRAINT IF EXISTS blogs_content_check;
    ALTER TABLE public.blogs ADD CONSTRAINT blogs_content_check CHECK (char_length(content) <= 10000);
END $$;

-- 3. Sinkronisasi Tabel Comments (Link ke Blog)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'comments' AND COLUMN_NAME = 'blog_id') THEN
        ALTER TABLE public.comments ADD COLUMN blog_id UUID REFERENCES public.blogs(id);
        
        -- Constraint: Komentar hanya boleh ke Post ATAU Blog, tidak keduanya
        ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_target_check;
        ALTER TABLE public.comments ADD CONSTRAINT comments_target_check 
            CHECK (
                (post_id IS NOT NULL AND blog_id IS NULL) OR 
                (post_id IS NULL AND blog_id IS NOT NULL)
            );
    END IF;
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
