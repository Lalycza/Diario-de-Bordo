-- Allow users with a valid area contract to read the contract row.
-- The clients SELECT policy checks for an active contract, but without a SELECT
-- policy on this table that EXISTS subquery is hidden by RLS for non-admin users.
-- can_access_client_area is SECURITY DEFINER and validates the user's area,
-- active contract, and any explicit area grant without exposing other areas.
create policy client_service_contracts_select_accessible
on public.client_service_contracts
for select
to authenticated
using (public.can_access_client_area(client_id, business_unit));
