-- ============================================
-- 008: Dynamic Template System
-- Adds content_templates table and description fields to stages/subjects
-- ============================================

-- Create enum for content type
DO $$ BEGIN
    CREATE TYPE content_type_enum AS ENUM ('plain', 'rich', 'json');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create content_templates table
CREATE TABLE IF NOT EXISTS content_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE, -- e.g. "home.hero.title"
    type content_type_enum DEFAULT 'plain',
    description TEXT, -- Admin-facing description
    category TEXT, -- e.g. "home", "stages", "paywall"
    
    -- Content fields
    content_ar TEXT,
    content_en TEXT,
    
    -- Metadata
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_templates_key ON content_templates(key);
CREATE INDEX IF NOT EXISTS idx_content_templates_category ON content_templates(category);

-- Add description fields to stages
ALTER TABLE levels ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE levels ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Add description fields to subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description_en TEXT;

-- RLS Policies
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can read public templates
DROP POLICY IF EXISTS "Public templates are viewable by everyone" ON content_templates;
CREATE POLICY "Public templates are viewable by everyone" ON content_templates
    FOR SELECT USING (is_public = true);

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage templates" ON content_templates;
CREATE POLICY "Admins can manage templates" ON content_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
