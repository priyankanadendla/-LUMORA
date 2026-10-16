/*
# Fix: Revoke all public EXECUTE on handle_new_user

## Security
- handle_new_user() is a SECURITY DEFINER trigger function that should only
  be called by the database trigger on auth.users insert, never via REST API.
- REVOKE EXECUTE FROM PUBLIC to close the default grant.
- Also explicitly revoke from anon and authenticated.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;