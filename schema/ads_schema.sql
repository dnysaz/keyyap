-- ============================================
-- ADS MANAGER SCHEMA v1.4 (RANDOMIZER & STATS)
-- ============================================

-- 1. Buat Tabel Dasar jika belum ada
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    external_link TEXT NOT NULL,
    cta_text TEXT DEFAULT 'Learn More',
    ads_type TEXT DEFAULT 'native',
    placement TEXT NOT NULL DEFAULT 'feed',
    image_position TEXT DEFAULT 'top',
    status TEXT DEFAULT 'draft',
    visual_style TEXT DEFAULT 'flat',
    bg_color TEXT DEFAULT '#ffffff',
    brand_logo_url TEXT,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PAKSA Tambah Kolom jika tabel sudah eksis (Safety Check)
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS image_position TEXT DEFAULT 'top';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS visual_style TEXT DEFAULT 'flat';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT '#ffffff';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;

-- 3. Update Policy (Admin & Public Access)
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ads are viewable by everyone" ON public.ads;
CREATE POLICY "Ads are viewable by everyone" ON public.ads FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Admin has full access to ads" ON public.ads;
CREATE POLICY "Admin has full access to ads" ON public.ads FOR ALL USING (true);

-- 4. ANALYTICS INCREMENT FUNCTION
CREATE OR REPLACE FUNCTION increment_ad_stats(ad_id UUID, stat_type TEXT)
RETURNS void AS $$
BEGIN
    IF stat_type = 'view' THEN
        UPDATE public.ads SET views_count = views_count + 1 WHERE id = ad_id;
    ELSIF stat_type = 'click' THEN
        UPDATE public.ads SET clicks_count = clicks_count + 1 WHERE id = ad_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RANDOM AD SELECTOR FUNCTION (RPC)
-- Fungsi ini akan mengacak iklan agar tidak itu-itu saja
CREATE OR REPLACE FUNCTION get_random_ad(p_placement TEXT)
RETURNS SETOF public.ads AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.ads
    WHERE status = 'active' AND placement = p_placement
    ORDER BY random()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. STORAGE CONFIGURATION
INSERT INTO storage.buckets (id, name, public) VALUES ('ads', 'ads', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "ads_select_public" ON storage.objects;
DROP POLICY IF EXISTS "ads_insert_auth" ON storage.objects;
CREATE POLICY "ads_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'ads');
CREATE POLICY "ads_insert_auth" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ads' AND auth.role() = 'authenticated');

-- 7. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
