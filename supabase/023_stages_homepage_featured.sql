-- ============================================
-- 023: Stages Homepage Featured
-- Add homepage control fields to stages table
-- ============================================

-- Add homepage control fields
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT TRUE;
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS home_order INT DEFAULT 0;
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS teaser_ar TEXT;
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS teaser_en TEXT;

-- Create index for homepage queries
CREATE INDEX IF NOT EXISTS idx_stages_show_on_home
ON public.stages(show_on_home, home_order) WHERE is_active = TRUE;

-- Update existing stages with homepage defaults
UPDATE public.stages SET show_on_home = TRUE, home_order = sort_order WHERE show_on_home IS NULL;

-- Comments
COMMENT ON COLUMN public.stages.show_on_home IS 'Whether this stage appears on the homepage';
COMMENT ON COLUMN public.stages.home_order IS 'Display order on homepage (lower numbers first)';
COMMENT ON COLUMN public.stages.teaser_ar IS 'Short Arabic teaser text for homepage display';
COMMENT ON COLUMN public.stages.teaser_en IS 'Short English teaser text for homepage display';
