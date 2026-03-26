
-- Add missing columns to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add stream to classes
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS stream text;

-- Add location and evidence_url to incidents
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS evidence_url text;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  performed_by uuid NOT NULL,
  target_id uuid,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view audit logs
CREATE POLICY "Authenticated users can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (true);

-- All authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create evidence storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload evidence
CREATE POLICY "Authenticated users can upload evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence');

-- Allow public read access to evidence
CREATE POLICY "Public can view evidence"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'evidence');

-- Enable realtime for audit_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
