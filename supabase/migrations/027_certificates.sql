-- ============================================
-- CERTIFICATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS certificates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
    subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
    template_id uuid REFERENCES templates(id) ON DELETE SET NULL,
    student_name text NOT NULL,
    course_name text NOT NULL,
    subject_name text,
    score int,
    issued_at timestamptz DEFAULT now(),
    verification_code text NOT NULL UNIQUE,
    pdf_url text,
    status text DEFAULT 'valid' CHECK (status IN ('valid', 'revoked')),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_lesson_id ON certificates(lesson_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Students can read their own certificates
CREATE POLICY "Students read own certificates" ON certificates
FOR SELECT USING (
    auth.uid() = student_id
);

-- Public can read certificates by verification_code (for verification page)
CREATE POLICY "Public verify certificates" ON certificates
FOR SELECT USING (
    true  -- verification page needs public read; filtered by verification_code in query
);

-- Authenticated users can insert their own certificates
CREATE POLICY "Students create own certificates" ON certificates
FOR INSERT WITH CHECK (
    auth.uid() = student_id
);

-- Admins can manage all certificates
CREATE POLICY "Admins manage certificates" ON certificates
FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin'))
);

-- ============================================
-- STORAGE BUCKET (run manually if migration doesn't apply)
-- ============================================

-- INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true)
-- ON CONFLICT (id) DO NOTHING;
