/*
# Fix: Revoke EXECUTE on handle_new_user from anon and authenticated

## Security
- handle_new_user() is a SECURITY DEFINER trigger function that should only
  be called by the database trigger on auth.users, not via the REST API.
- Revoke EXECUTE from anon and authenticated roles to prevent direct calls.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;