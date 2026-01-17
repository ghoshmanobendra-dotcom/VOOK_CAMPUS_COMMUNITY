create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  image_url text,
  github_link text,
  live_link text,
  technologies text[],
  created_at timestamptz default now()
);

alter table public.projects enable row level security;

create policy "Projects are viewable by everyone" 
  on public.projects for select 
  using (true);

create policy "Users can insert their own projects" 
  on public.projects for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own projects" 
  on public.projects for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own projects" 
  on public.projects for delete 
  using (auth.uid() = user_id);
