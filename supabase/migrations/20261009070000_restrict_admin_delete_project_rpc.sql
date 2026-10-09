-- Restrict the privileged project-deletion RPC to authenticated sessions.
-- The function body already enforces administrator-level authorization; this
-- removes anonymous/public invocation without changing authenticated behavior.
REVOKE EXECUTE ON FUNCTION public.admin_delete_project_by_legacy(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_project_by_legacy(text) TO authenticated;
