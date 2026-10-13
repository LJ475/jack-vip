-- ============================================================
-- Supabase 侧的表结构（public.users）
--
-- 用途：登录/注册时往这里补一行「这个账号是谁、什么时候来的」，
--       见 utils/auth.js 的 insertUserInfo()。
-- 执行：Supabase Dashboard → SQL Editor → 整段粘进去 Run。
--       本文件可重复执行（if not exists / drop policy if exists）。
--
-- 【为什么表里不挂 auth.users 外键】
-- 这行是客户端拿用户自己的 access_token 写的（authenticated 角色），
-- 不挂外键就少一层依赖：auth.users 那边出问题不会连累这张表，
-- 也不用装触发器。代价是删账号时要自己清这行 —— 见文件末尾。
--
-- 【安全边界】RLS 只给 authenticated 开三条策略（读/写/改自己那行）。
-- anon（没登录）读不到任何行；客户端也删不掉别人的行。
-- 这是实测过的：anon key 直接 GET /rest/v1/users 回的是 []，不是报错。
-- ============================================================

create table if not exists public.users (
  user_id    uuid        primary key,               -- = auth.users.id，一个账号一行
  email      text        not null default '',
  created_at timestamptz not null default now()     -- auth.js 只写前两列，这列靠默认值
);

-- 按邮箱查人（人工重置密码、看某个邮箱有没有注册过）用得上
create index if not exists users_email_idx on public.users (lower(email));

alter table public.users enable row level security;

-- 三条策略都限定 to authenticated：anon 连表都读不到
drop policy if exists "本人可读自己那行" on public.users;
create policy "本人可读自己那行" on public.users
  for select to authenticated
  using (auth.uid() = user_id);

-- 注册/首次登录时补写自己那行；with check 挡住「替别人写一行」
drop policy if exists "本人可写自己那行" on public.users;
create policy "本人可写自己那行" on public.users
  for insert to authenticated
  with check (auth.uid() = user_id);

-- auth.js 用的是 upsert（Prefer: resolution=merge-duplicates），
-- 老用户再次登录会走 UPDATE，所以这条不能少
drop policy if exists "本人可改自己那行" on public.users;
create policy "本人可改自己那行" on public.users
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- PostgREST 需要显式的表级授权，否则再对的 RLS 也会回 401
grant select, insert, update on public.users to authenticated;
grant all on public.users to service_role;

-- ============================================================
-- 自检（可选，粘出来单独跑）
-- ============================================================
-- 1) RLS 是开的：
--    select relname, relrowsecurity from pg_class where relname = 'users';
-- 2) 三条策略都在、且都只给 authenticated：
--    select policyname, roles, cmd from pg_policies where tablename = 'users';
-- 3) 拿 anon key 直接读应该是空数组（不是报错、更不是别人的数据）：
--    curl "$SUPABASE_URL/rest/v1/users?select=*" -H "apikey: $ANON_KEY"

-- ============================================================
-- 注销账号（客户端做不到，需要 service_role）
--
-- 客户端只有 anon key，删不掉 auth.users 里的用户 —— 这是设计如此。
-- 目前只能人工在 Dashboard → Authentication → Users 里删。
-- 之后做「注销账号」功能时，正确姿势是在已有的 Cloudflare Worker 里加一条路由：
--   1. 收客户端传来的 access_token，调 /auth/v1/user 验明正身；
--   2. 用 service_role key（存 Worker secret，绝不进 App/仓库）调
--      DELETE /auth/v1/admin/users/{id}；
--   3. 顺手清掉这张表里那一行（上面没挂外键，所以不会自动级联）：
--      delete from public.users where user_id = '<id>';
-- ============================================================
