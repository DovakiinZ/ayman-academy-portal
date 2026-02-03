-- Add content_type enum
CREATE TYPE content_item_type AS ENUM ('video', 'article', 'image', 'file', 'link');

-- Create content_items table
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  type content_item_type NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  content_url TEXT, -- Used for video, image, file, link
  content_text TEXT, -- Used for article (basic RTL text)
  is_published BOOLEAN DEFAULT false,
  is_free_preview BOOLEAN DEFAULT false, -- Access: Free preview / Paid
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- Policies for content_items

-- Select: Public if published, Owner if authenticated, Admin always
CREATE POLICY "content_items_select" ON public.content_items 
FOR SELECT USING (
  is_published = true 
  OR EXISTS (SELECT 1 FROM public.courses WHERE id = content_items.subject_id AND teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Insert: Only Teacher (for own subject) or Admin
CREATE POLICY "content_items_insert" ON public.content_items 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE id = content_items.subject_id AND teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Update: Only Teacher (for own subject) or Admin
CREATE POLICY "content_items_update" ON public.content_items 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = content_items.subject_id AND teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Delete: Only Teacher (for own subject) or Admin
CREATE POLICY "content_items_delete" ON public.content_items 
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = content_items.subject_id AND teacher_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Trigger for updated_at
CREATE TRIGGER update_content_items_ts BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update courses (Subjects) RLS to allow Admin override
DROP POLICY IF EXISTS "courses_admin" ON public.courses;
CREATE POLICY "courses_admin" ON public.courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "courses_teacher_own" ON public.courses;
CREATE POLICY "courses_teacher_own" ON public.courses FOR ALL USING (
  teacher_id = auth.uid()
);
