-- ============================================================
-- 教师智能工作台 · 云端同步表（在 Supabase SQL Editor 中执行）
-- ============================================================

-- 1) 建表：整库状态存为一个 JSON 文档，按「工作台密钥(id)」存取
create table if not exists public.workbench_data (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) 开启行级安全（RLS）
alter table public.workbench_data enable row level security;

-- 3) 匿名（anon）可读写：以「工作台密钥 id」作为共享口令
--    anon key 是公开密钥，真正的隔离靠 id 这串只有你知道/分享的口令。
drop policy if exists "wb_anon_all" on public.workbench_data;
create policy "wb_anon_all" on public.workbench_data
  for all to anon
  using (true) with check (true);

-- 4) 开启实时订阅（其他设备修改后，本端自动刷新）
do $$
begin
  begin
    alter publication supabase_realtime add table public.workbench_data;
  exception when duplicate_object then
    null;
  end;
end $$;
