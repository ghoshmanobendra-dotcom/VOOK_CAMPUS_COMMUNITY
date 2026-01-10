-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (Create if not exists)
create table if not exists public.profiles (
  id uuid references auth.users not null,
  username text,
  full_name text,
  avatar_url text,
  college text,
  department text,
  passout_year text,
  bio text,
  gender text,
  dob date,
  updated_at timestamp with time zone,
  
  primary key (id),
  unique(username),
  constraint username_length check (char_length(username) >= 3)
);

-- ROBUSTLY ADD COLUMNS IF THEY ARE MISSING
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists background_url text;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists college text;
alter table public.profiles add column if not exists passout_year text;
alter table public.profiles add column if not exists dob date;
alter table public.profiles add column if not exists terms_accepted boolean default false;

-- Auto-accept for existing profiles (so they don't see the popup)
update public.profiles set terms_accepted = true where terms_accepted is null;

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 2. POSTS TABLE
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  content text,
  image_urls text[], 
  video_url text,
  community_tag text,
  is_official boolean default false,
  is_anonymous boolean default false,
  upvotes int default 0,
  comments_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.posts add column if not exists is_anonymous boolean default false;

alter table public.posts enable row level security;

drop policy if exists "Posts are viewable by everyone." on posts;
create policy "Posts are viewable by everyone."
  on posts for select
  using ( true );

drop policy if exists "Users can create posts." on posts;
create policy "Users can create posts."
  on posts for insert
  with check ( auth.uid() = user_id );

-- 3. INTERACTION TABLES
create table if not exists public.likes (
  user_id uuid references public.profiles(id) not null,
  post_id uuid references public.posts(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_anonymous boolean default false,
  primary key (user_id, post_id, is_anonymous)
);
alter table public.likes enable row level security;
drop policy if exists "Likes are viewable by everyone" on likes;
create policy "Likes are viewable by everyone" on likes for select using ( true );
drop policy if exists "Users can insert their own likes" on likes;
create policy "Users can insert their own likes" on likes for insert with check ( auth.uid() = user_id );
drop policy if exists "Users can delete their own likes" on likes;
create policy "Users can delete their own likes" on likes for delete using ( auth.uid() = user_id );

-- Update existing table if needed
alter table public.likes add column if not exists is_anonymous boolean default false;
do $$ 
begin
  if not exists (select 1 from pg_constraint where conname = 'likes_pkey_new') then
    alter table public.likes drop constraint if exists likes_pkey;
    alter table public.likes add constraint likes_pkey_new primary key (user_id, post_id, is_anonymous);
  end if;
end $$;


create table if not exists public.bookmarks (
  user_id uuid references public.profiles(id) not null,
  post_id uuid references public.posts(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_anonymous boolean default false,
  primary key (user_id, post_id, is_anonymous)
);
alter table public.bookmarks enable row level security;
drop policy if exists "Bookmarks are viewable by owner" on bookmarks;
create policy "Bookmarks are viewable by owner" on bookmarks for select using ( auth.uid() = user_id );
drop policy if exists "Users can insert their own bookmarks" on bookmarks;
create policy "Users can insert their own bookmarks" on bookmarks for insert with check ( auth.uid() = user_id );
drop policy if exists "Users can delete their own bookmarks" on bookmarks;
create policy "Users can delete their own bookmarks" on bookmarks for delete using ( auth.uid() = user_id );

-- Update existing table if needed
alter table public.bookmarks add column if not exists is_anonymous boolean default false;
do $$ 
begin
  if not exists (select 1 from pg_constraint where conname = 'bookmarks_pkey_new') then
    alter table public.bookmarks drop constraint if exists bookmarks_pkey;
    alter table public.bookmarks add constraint bookmarks_pkey_new primary key (user_id, post_id, is_anonymous);
  end if;
end $$;

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) not null,
  following_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);
alter table public.follows enable row level security;
drop policy if exists "Follows are viewable by everyone" on follows;
create policy "Follows are viewable by everyone" on follows for select using ( true );
drop policy if exists "Users can follow others" on follows;
create policy "Users can follow others" on follows for insert with check ( auth.uid() = follower_id );
drop policy if exists "Users can unfollow" on follows;
create policy "Users can unfollow" on follows for delete using ( auth.uid() = follower_id );

-- STORAGE
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict (id) do update set public = true;

drop policy if exists "Images are publicly accessible." on storage.objects;
create policy "Images are publicly accessible." on storage.objects for select using ( bucket_id = 'images' );

drop policy if exists "Authenticated users can upload images." on storage.objects;
create policy "Authenticated users can upload images." on storage.objects for insert with check ( bucket_id = 'images' and auth.role() = 'authenticated' );

-- Ensure update/delete policies exist if needed (though delete is handled by owner usually)
drop policy if exists "Users can delete own images" on storage.objects;
create policy "Users can delete own images" on storage.objects for delete using ( bucket_id = 'images' and auth.uid()::text = (storage.foldername(name))[1] );

-- RPCs
create or replace function increment_upvotes(row_id uuid) returns void as $$
begin update public.posts set upvotes = upvotes + 1 where id = row_id; end; $$ language plpgsql;

create or replace function decrement_upvotes(row_id uuid) returns void as $$
begin update public.posts set upvotes = upvotes - 1 where id = row_id; end; $$ language plpgsql;

-- 4. FOLLOWER COUNTS
-- Add columns to profiles
alter table public.profiles add column if not exists followers int default 0;
alter table public.profiles add column if not exists following int default 0;

-- Function to handle follower/following count updates
create or replace function public.handle_new_follow()
returns trigger as $$
begin
  -- Increment following count for the follower
  update public.profiles
  set following = following + 1
  where id = new.follower_id;

  -- Increment followers count for the person being followed
  update public.profiles
  set followers = followers + 1
  where id = new.following_id;

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.handle_unfollow()
returns trigger as $$
begin
  -- Decrement following count for the follower
  update public.profiles
  set following = following - 1
  where id = old.follower_id;

  -- Decrement followers count for the person being followed
  update public.profiles
  set followers = followers - 1
  where id = old.following_id;

  return old;
end;
$$ language plpgsql security definer;

-- Triggers
drop trigger if exists on_follow_added on public.follows;
create trigger on_follow_added
  after insert on public.follows
  for each row execute procedure public.handle_new_follow();

drop trigger if exists on_follow_removed on public.follows;
create trigger on_follow_removed
  after delete on public.follows
  for each row execute procedure public.handle_unfollow();

-- Backfill counts for existing data (Run this once to sync counts)
with follower_counts as (
  select following_id, count(*) as count from public.follows group by following_id
),
following_counts as (
  select follower_id, count(*) as count from public.follows group by follower_id
)
update public.profiles
set
  following = coalesce((select count from following_counts where follower_id = profiles.id), 0);

-- 5. NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  recipient_id uuid references public.profiles(id) not null,
  sender_id uuid references public.profiles(id), -- Nullable for system notifications
  type text not null, -- 'follow', 'like', 'comment', 'announcement', 'message'
  content text,
  reference_id uuid, -- ID of related post/comment/etc
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

drop policy if exists "Users can see their own notifications" on notifications;
create policy "Users can see their own notifications" on notifications for select using ( auth.uid() = recipient_id );

-- 6. NOTIFICATION TRIGGERS
-- Trigger for Follows
create or replace function public.create_follow_notification()
returns trigger as $$
begin
  insert into public.notifications (recipient_id, sender_id, type, content)
  values (new.following_id, new.follower_id, 'follow', 'started following you');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_follow_notification on public.follows;
create trigger on_follow_notification
  after insert on public.follows
  for each row execute procedure public.create_follow_notification();

-- Trigger for Likes
create or replace function public.create_like_notification()
returns trigger as $$
declare
  post_owner_id uuid;
begin
  select user_id into post_owner_id from public.posts where id = new.post_id;
  
  -- Don't notify if liking own post
  if post_owner_id != new.user_id then
    insert into public.notifications (recipient_id, sender_id, type, reference_id, content)
    values (post_owner_id, new.user_id, 'like', new.post_id, 'liked your post');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_notification on public.likes;
create trigger on_like_notification
  after insert on public.likes
  for each row execute procedure public.create_like_notification();

-- 7. STORIES TABLE
create table if not exists public.stories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  media_url text not null,
  caption text,
  caption_settings jsonb,
  filter_name text,
  campus_id text, -- Stores the college name/ID
  visibility text default 'campus' check (visibility in ('public', 'campus', 'followers')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default timezone('utc'::text, now() + interval '24 hours') not null
);

-- Update existing stories table if needed (Migration Fix)
alter table public.stories add column if not exists visibility text default 'campus';
alter table public.stories add column if not exists campus_id text;

do $$ 
begin
  if not exists (select 1 from pg_constraint where conname = 'stories_visibility_check') then
    alter table public.stories add constraint stories_visibility_check check (visibility in ('public', 'campus', 'followers'));
  end if;
exception
  when duplicate_object then null;
end $$;

alter table public.stories enable row level security;

-- Helper function to check if user follows story owner
create or replace function public.is_following(target_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = target_user_id
  );
$$ language sql security definer;

-- Helper function to check if user is in same campus
create or replace function public.is_same_campus(target_campus_id text)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and college = target_campus_id
  );
$$ language sql security definer;

drop policy if exists "Stories are viewable based on visibility Rules" on stories;
create policy "Stories are viewable based on visibility Rules"
  on stories for select
  using (
    expires_at > timezone('utc'::text, now()) -- must be active
    AND (
      auth.uid() = user_id -- Owner can always see
      OR visibility = 'public'
      OR (visibility = 'campus' AND public.is_same_campus(campus_id))
      OR (visibility = 'followers' AND public.is_following(user_id))
    )
  );

drop policy if exists "Users can insert their own stories" on stories;
create policy "Users can insert their own stories"
  on stories for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can delete their own stories" on stories;
create policy "Users can delete their own stories"
  on stories for delete
  using ( auth.uid() = user_id );


-- 8. STORY INTERACTIONS

-- Views
create table if not exists public.story_views (
  id uuid default uuid_generate_v4() primary key,
  story_id uuid references public.stories(id) on delete cascade not null,
  viewer_id uuid references public.profiles(id) on delete cascade not null,
  viewed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(story_id, viewer_id)
);
alter table public.story_views enable row level security;

drop policy if exists "Users can insert their own views" on story_views;
create policy "Users can insert their own views" on story_views for insert with check (auth.uid() = viewer_id);

drop policy if exists "Story owners can see views" on story_views;
create policy "Story owners can see views" on story_views for select using (
    exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid()) 
    or auth.uid() = viewer_id -- Viewer can see their own view record
);

-- Likes (Upvotes) on Stories
create table if not exists public.story_likes (
  id uuid default uuid_generate_v4() primary key,
  story_id uuid references public.stories(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(story_id, user_id)
);
alter table public.story_likes enable row level security;

drop policy if exists "Users can like stories" on story_likes;
create policy "Users can like stories" on story_likes for insert with check (auth.uid() = user_id);

drop policy if exists "Users can unlike stories" on story_likes;
create policy "Users can unlike stories" on story_likes for delete using (auth.uid() = user_id);

drop policy if exists "Everyone can see story likes" on story_likes;
create policy "Everyone can see story likes" on story_likes for select using (true);


-- Comments on Stories
create table if not exists public.story_comments (
  id uuid default uuid_generate_v4() primary key,
  story_id uuid references public.stories(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.story_comments enable row level security;

drop policy if exists "Users can comment on stories" on story_comments;
create policy "Users can comment on stories" on story_comments for insert with check (auth.uid() = user_id);

drop policy if exists "See story comments" on story_comments;
create policy "See story comments" on story_comments for select using (
   auth.uid() = user_id OR 
   exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid())
);

-- 9. CHAT SYSTEM

-- Chats Table
create table if not exists public.chats (
  id uuid default uuid_generate_v4() primary key,
  type text default 'private', -- 'private' or 'group'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat Participants Table
create table if not exists public.chat_participants (
  chat_id uuid references public.chats(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (chat_id, user_id)
);

-- Ensure role column exists
alter table public.chat_participants add column if not exists role text default 'member';

-- Messages Table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read_at timestamp with time zone
);

-- RLS Policies

alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- Helper function to avoid infinite recursion in policies
create or replace function public.is_chat_member(target_chat_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.chat_participants
    where chat_id = target_chat_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Add created_by column to handle initial visibility
alter table public.chats add column if not exists created_by uuid default auth.uid();

-- Chats Policies
drop policy if exists "Users can view chats they are part of" on chats;
create policy "Users can view chats they are part of"
  on chats for select
  using (
    -- User created the chat (so they can see it initially)
    created_by = auth.uid()
    -- OR they are a participant (normal case)
    OR public.is_chat_member(id)
  );

drop policy if exists "Users can create chats" on chats;
create policy "Users can create chats"
  on chats for insert
  with check (true); 

-- Chat Participants Policies
drop policy if exists "Users can view participants of their chats" on chat_participants;
create policy "Users can view participants of their chats"
  on chat_participants for select
  using (
    -- User can see their own participation row
    user_id = auth.uid()
    -- OR they can see other rows if they are a member of that chat
    OR public.is_chat_member(chat_id)
  );

drop policy if exists "Authenticated users can add participants" on chat_participants;
create policy "Authenticated users can add participants"
    on chat_participants for insert
    with check ( auth.role() = 'authenticated' );

-- Messages Policies
drop policy if exists "Users can view messages in their chats" on messages;
create policy "Users can view messages in their chats"
  on messages for select
  using (
    public.is_chat_member(chat_id)
  );

drop policy if exists "Users can send messages to their chats" on messages;
create policy "Users can send messages to their chats"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_chat_member(chat_id)
  );
  
-- Indexing for performance
create index if not exists idx_messages_chat_id on public.messages(chat_id);
create index if not exists idx_messages_created_at on public.messages(created_at);
create index if not exists idx_chat_participants_user_id on public.chat_participants(user_id);

-- 10. COMMUNITIES (WhatsApp Style)
create table if not exists public.communities (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  image_url text,
  owner_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.communities enable row level security;

drop policy if exists "Communities are viewable by everyone" on communities;
create policy "Communities are viewable by everyone" on communities for select using (true);

drop policy if exists "Users can create communities" on communities;
create policy "Users can create communities" on communities for insert with check (auth.uid() = owner_id);

drop policy if exists "Owners can update communities" on communities;
create policy "Owners can update communities" on communities for update using (auth.uid() = owner_id);

-- Update Chats for Community support
alter table public.chats add column if not exists community_id uuid references public.communities(id);
alter table public.chats add column if not exists is_announcement boolean default false;
alter table public.chats add column if not exists name text; -- Chat Name (e.g. Group Name)
alter table public.chats add column if not exists image_url text;

-- Restrict messaging in announcement channels to Community Admins (Owner)
-- This requires a simplified check or function. 
-- For now, handled in UI/API, strict Row Level Security would require joining communities.

