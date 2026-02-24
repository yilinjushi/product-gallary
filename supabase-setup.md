# Supabase 配置说明（解决「fail to create product」）

保存产品时若卡在 "Uploading & Saving..." 并提示失败，多半是 **Storage 桶** 或 **数据库表/RLS** 未配置好。按下面检查。

## 1. Storage：创建图片桶

1. 打开 Supabase 控制台 → **Storage**。
2. 点击 **New bucket**。
3. **Name** 填：`product-images`（必须与代码一致）。
4. 勾选 **Public bucket**（或后面为 `product-images` 配置公开读策略）。
5. 创建后，进入该桶 → **Policies** → 新增策略：
   - **Policy name**: `Allow authenticated uploads`
   - **Allowed operation**: INSERT, UPDATE（上传）、SELECT（读）
   - **Target roles**: authenticated
   - **Policy definition**: `true` 或按需用 `auth.uid() = user_id` 等。

若希望未登录也能上传（不推荐），可单独再建一条策略；一般用 **authenticated** 即可。

## 2. 数据库表：products

在 **SQL Editor** 中执行（表不存在时）：

```sql
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  images text[] not null default '{}',
  tag text,
  fav integer not null default 300,
  views integer not null default 3000,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 如果表已存在，请执行以下命令添加 fav 和 views 列：
-- alter table public.products add column fav integer not null default 300;
-- alter table public.products add column views integer not null default 3000;

-- 启用 RLS
alter table public.products enable row level security;

-- 已登录用户可插入自己的行
create policy "Users can insert own products"
  on public.products for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 已登录用户可更新自己的行
create policy "Users can update own products"
  on public.products for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 已登录用户可删除自己的行
create policy "Users can delete own products"
  on public.products for delete
  to authenticated
  using (auth.uid() = user_id);

-- 所有人可读（前台展示）
create policy "Anyone can read products"
  on public.products for select
  to anon, authenticated
  using (true);
```

若你的表已有但列不同，请对照上面列名（尤其是 `images` 为 **text[]**、`user_id`、`created_at`）和 RLS 策略是否允许当前用户 insert。

## 3. 如何看具体报错

- 保存失败时，表单下方会显示 **具体错误信息**（如 "图片上传失败: ..." 或 "new row violates row-level security policy"）。
- 打开浏览器 **开发者工具 → Console**，可看到完整 `console.error` 输出，便于对照 Supabase 文档排查。

按上述检查并修正后，再试一次「保存」即可。
