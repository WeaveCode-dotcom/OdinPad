-- Phase 2 storage hardening

ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ensure stored document shape is an object
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'novels_data_object_check'
  ) THEN
    ALTER TABLE public.novels
      ADD CONSTRAINT novels_data_object_check CHECK (jsonb_typeof(data) = 'object');
  END IF;
END$$;

-- Increment version on any update to novel payload metadata
CREATE OR REPLACE FUNCTION public.bump_novel_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 1) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS bump_novel_version_trg ON public.novels;
CREATE TRIGGER bump_novel_version_trg
  BEFORE UPDATE ON public.novels
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_novel_version();

-- Track schema/data migration versions at project level
CREATE TABLE IF NOT EXISTS public.migration_versions (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.migration_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read migration versions" ON public.migration_versions;
CREATE POLICY "Read migration versions"
  ON public.migration_versions
  FOR SELECT
  TO authenticated
  USING (true);
