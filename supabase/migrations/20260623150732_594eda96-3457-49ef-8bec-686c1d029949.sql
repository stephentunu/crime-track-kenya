
DROP POLICY IF EXISTS "recorder or admin updates ob" ON public.ob_entries;
CREATE POLICY "recorder admin or investigator updates ob" ON public.ob_entries FOR UPDATE TO authenticated
  USING (recorded_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'investigator'))
  WITH CHECK (recorded_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'investigator'));

DROP POLICY IF EXISTS "assignee creator or admin updates cases" ON public.cases;
CREATE POLICY "assignee creator or admin updates cases" ON public.cases FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "any authenticated links case offenders" ON public.case_offenders;
DROP POLICY IF EXISTS "any authenticated unlinks case offenders" ON public.case_offenders;
CREATE POLICY "case editors link offenders" ON public.case_offenders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "case editors unlink offenders" ON public.case_offenders FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id
    AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
