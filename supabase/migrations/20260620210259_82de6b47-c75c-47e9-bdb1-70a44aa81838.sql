REVOKE SELECT (token_hash, pin_hash) ON public.students FROM authenticated;
REVOKE SELECT (token_hash, pin_hash) ON public.students FROM anon;