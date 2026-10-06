-- ─────────────────────────────────────────────────────────────
-- GO! 홈프로텍터 자동 백업용 테이블
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run 하면 된다. (여러 번 실행해도 안전)
--
-- 로그인 없이 쓰는 개인용 앱이라, 기기마다 만들어지는 무작위 "백업 코드"(UUID)가 열쇠다.
-- 테이블은 RLS 로 완전히 잠그고, 백업 코드를 아는 경우에만 아래 두 함수로 저장/불러오기 할 수 있다.
-- (anon 키로 테이블 전체를 읽거나 남의 백업을 훑어볼 수 없다)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.homeprotector_backups (
  backup_key uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.homeprotector_backups enable row level security;
revoke all on public.homeprotector_backups from anon, authenticated;

create or replace function public.homeprotector_save_backup(p_key uuid, p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_at timestamptz;
begin
  if pg_column_size(p_data) > 2 * 1024 * 1024 then
    raise exception 'backup too large';
  end if;
  insert into homeprotector_backups (backup_key, data, updated_at)
  values (p_key, p_data, now())
  on conflict (backup_key) do update set data = excluded.data, updated_at = now()
  returning updated_at into saved_at;
  return saved_at;
end;
$$;

create or replace function public.homeprotector_load_backup(p_key uuid)
returns table (data jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select b.data, b.updated_at from homeprotector_backups b where b.backup_key = p_key;
$$;

revoke all on function public.homeprotector_save_backup(uuid, jsonb) from public;
revoke all on function public.homeprotector_load_backup(uuid) from public;
grant execute on function public.homeprotector_save_backup(uuid, jsonb) to anon, authenticated;
grant execute on function public.homeprotector_load_backup(uuid) to anon, authenticated;
