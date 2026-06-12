
-- Allow Principal to delete profiles and audit logs
CREATE POLICY "Principal can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));

CREATE POLICY "Principal can delete audit logs"
  ON public.audit_logs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'principal'));
