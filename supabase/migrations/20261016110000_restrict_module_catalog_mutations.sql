-- Restrict global catalog mutations to administrators and supervisors.
-- Removing these analyst-inclusive policies prevents a project-scoped role
-- from changing or deleting a shared module used by other projects/products.
-- Project-specific module removal remains handled by project_module_exclusions.
DROP POLICY IF EXISTS modules_delete_admin_supervisor_or_analista ON public.modules;
DROP POLICY IF EXISTS modules_update_admin_supervisor_or_analista ON public.modules;
