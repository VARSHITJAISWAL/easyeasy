
alter function public.generate_service_code(public.service_type) set search_path = public;
revoke execute on function public.generate_service_code(public.service_type) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
