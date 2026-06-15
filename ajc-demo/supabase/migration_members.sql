-- スタッフマスター
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read staff_members"
  ON staff_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated write staff_members"
  ON staff_members FOR ALL TO authenticated USING (true);
