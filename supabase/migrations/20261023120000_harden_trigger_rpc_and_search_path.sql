-- EIAFC database hardening applied to Supabase project opypgilifxnrwqmpsnzp.
-- This migration is intentionally limited to two non-breaking changes:
-- 1) prevent direct invocation of a trigger-only SECURITY DEFINER function;
-- 2) pin search_path on semver helper to avoid mutable search_path warnings.
-- The remaining legacy Cloud RPCs still serve existing clients and are not revoked
-- until a compatible authenticated gateway is deployed and validated.

REVOKE EXECUTE ON FUNCTION public.eiafc_guard_student_identity_collision() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.eiafc_semver_num(text) SET search_path = public, pg_temp;
