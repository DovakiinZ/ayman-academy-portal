-- 106_admin_reissue_certificate.sql
--
-- STATUS: NOT APPLIED. Review, then paste into the Supabase SQL editor.
--         Never run `supabase db push` on this project — the migrations folder
--         still contains files that drop the public schema.
--
-- WHY THIS EXISTS
-- The admin "Re-issue certificate" button (src/pages/admin/CertificatesManagement.tsx)
-- calls an RPC named `admin_reissue_certificate`. That function does not exist
-- in the live database, so the button has never worked; it failed with a raw
-- PostgREST `PGRST202`. This was found by diffing every .rpc() call in the
-- codebase against `supabase gen types typescript` output from the live project.
--
-- Unlike the other two broken certificate calls, this one could not be fixed in
-- the client: re-issuing means INSERTing a new `certificates` row, and INSERT is
-- deliberately closed to clients so a student cannot mint their own certificate.
-- The operation has to live in a SECURITY DEFINER function.
--
-- WHAT IT DOES
-- Supersedes a certificate with a new version of itself:
--   * copies the original row, incrementing `version`
--   * links the copy back via `reissued_from_id`
--   * issues a fresh `verification_code`, so the old QR stops resolving to the
--     replacement and each printed certificate maps to exactly one record
--   * marks the original `revoked`
-- The snapshot is copied verbatim rather than rebuilt: a re-issue replaces a
-- damaged or superseded artefact, and the student's name, score and completion
-- date must not silently change underneath them.

create or replace function public.admin_reissue_certificate(
  p_certificate_id uuid,
  p_reason text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_old  public.certificates%rowtype;
  v_new_id uuid;
begin
  -- Authorisation. SECURITY DEFINER runs as the owner, so this check is the
  -- only thing standing between any authenticated user and a forged
  -- certificate. Read the role directly rather than trusting a claim.
  select role into v_caller_role
  from public.profiles
  where id = auth.uid();

  if v_caller_role is distinct from 'super_admin' then
    return json_build_object('error', 'Forbidden: super_admin required');
  end if;

  select * into v_old
  from public.certificates
  where id = p_certificate_id;

  if not found then
    return json_build_object('error', 'Certificate not found');
  end if;

  if v_old.status = 'revoked' then
    return json_build_object('error', 'Certificate is already revoked');
  end if;

  insert into public.certificates (
    student_id, subject_id, student_name, student_email, course_name,
    subject_name, score, snapshot_json, template_id, template_version,
    render_mode, status, version, reissued_from_id, verification_code, issued_at
  )
  values (
    v_old.student_id, v_old.subject_id, v_old.student_name, v_old.student_email,
    v_old.course_name, v_old.subject_name, v_old.score, v_old.snapshot_json,
    v_old.template_id, v_old.template_version, v_old.render_mode,
    'issued',
    coalesce(v_old.version, 1) + 1,
    v_old.id,
    -- A new code: the superseded certificate keeps its own, so an old printout
    -- verifies as revoked rather than silently resolving to the new one.
    encode(gen_random_bytes(8), 'hex'),
    now()
  )
  returning id into v_new_id;

  update public.certificates
  set status = 'revoked'
  where id = v_old.id;

  -- Best effort: this project's audit_logs shape has changed before, and a
  -- re-issue must not fail because logging did.
  begin
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
    values (
      auth.uid(), 'certificate.reissue', 'certificates', v_new_id,
      json_build_object('from', v_old.id, 'reason', p_reason)
    );
  exception when others then
    null;
  end;

  return json_build_object(
    'certificate_id', v_new_id,
    'superseded_id', v_old.id,
    'version', coalesce(v_old.version, 1) + 1
  );
end;
$$;

revoke all on function public.admin_reissue_certificate(uuid, text) from public, anon;
grant execute on function public.admin_reissue_certificate(uuid, text) to authenticated;

-- VERIFY, as a non-admin — this must return the Forbidden JSON, not a new row:
--   select public.admin_reissue_certificate('<some-certificate-uuid>', 'test');
