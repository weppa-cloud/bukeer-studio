-- Issue #274
-- Ensure get_website_by_subdomain returns websites.default_locale and websites.supported_locales.
-- The base function is legacy and not versioned in this repository, so we patch the
-- current function definition in-place to avoid drifting unrelated fields.

do $migration$
declare
  v_function_oid regprocedure := to_regprocedure('public.get_website_by_subdomain(text)');
  v_function_def text;
  v_patched_def text;
begin
  if v_function_oid is null then
    raise warning 'Function public.get_website_by_subdomain(text) was not found; skipping locale-column patch.';
    return;
  end if;

  v_function_def := pg_get_functiondef(v_function_oid);

  if v_function_def ~ $re$'default_locale'\s*,$re$
     and v_function_def ~ $re$'supported_locales'\s*,$re$ then
    raise notice 'Function public.get_website_by_subdomain(text) already includes locale columns.';
  else
    v_patched_def := regexp_replace(
      v_function_def,
      $re$'subdomain'\s*,\s*([a-z_][a-z0-9_]*)\.[a-z_][a-z0-9_]*\s*,$re$,
      E'''subdomain'', \\1.subdomain,\n    ''default_locale'', \\1.default_locale,\n    ''supported_locales'', \\1.supported_locales,',
      'n'
    );

    if v_patched_def = v_function_def then
      v_patched_def := regexp_replace(
        v_function_def,
        $re$'custom_domain'\s*,\s*([a-z_][a-z0-9_]*)\.[a-z_][a-z0-9_]*\s*,$re$,
        E'''custom_domain'', \\1.custom_domain,\n    ''default_locale'', \\1.default_locale,\n    ''supported_locales'', \\1.supported_locales,',
        'n'
      );
    end if;

    if v_patched_def = v_function_def then
      raise exception 'Could not patch public.get_website_by_subdomain(text): expected subdomain/custom_domain key in jsonb_build_object.';
    end if;

    execute v_patched_def;
    raise notice 'Patched public.get_website_by_subdomain(text) with locale columns.';
  end if;

  execute 'grant execute on function public.get_website_by_subdomain(text) to anon, authenticated';
end;
$migration$;
