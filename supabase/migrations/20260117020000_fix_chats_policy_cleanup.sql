-- 1. Create community_members table if it doesn't exist
-- This is required because the frontend explicitly tries to sync members to this table.
create table if not exists public.community_members (
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member', -- 'admin', 'member', 'moderator'
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (community_id, user_id)
);

-- Enable RLS
alter table public.community_members enable row level security;

-- Policies for community_members
-- View: Everyone (public community members list) or Members only? 
-- Let's make it public for simplicity based on "Community Page" usually being visible.
drop policy if exists "Community members are viewable by everyone" on community_members;
create policy "Community members are viewable by everyone" on community_members for select using (true);

-- Insert: Authenticated users can join (if public) or Admins can add others.
-- For "Add Group" sync, the current user (admin of group) adds ALL participants.
-- So we need to allow inserting *others*.
drop policy if exists "Authenticated users can insert members" on community_members;
create policy "Authenticated users can insert members" on community_members for insert with check (auth.role() = 'authenticated');

-- Update: Only Admis/Self?
drop policy if exists "Users can update own membership" on community_members;
create policy "Users can update own membership" on community_members for update using (auth.uid() = user_id);

-- Delete: Self (leave) or Admin (remove)
drop policy if exists "Users can leave community" on community_members;
create policy "Users can leave community" on community_members for delete using (auth.uid() = user_id);


-- 2. Fix Chats Update Policy
-- Users need to be able to updates 'chats' to set 'community_id' (Link Group)
-- They must be an Admin of the chat.
drop policy if exists "Chat admins can update chat" on chats;
create policy "Chat admins can update chat"
  on chats
  for update
  using (
    exists (
      select 1 from public.chat_participants
      where chat_id = id
      and user_id = auth.uid()
      and role = 'admin'
    )
    OR created_by = auth.uid()
  );

-- 3. Fix Chats Select Policy (Enhancement)
-- Ensure unlinked groups are visible to their owners (already covered by "view chats they are part of")
-- Ensure linked groups are visible to community members (already covered by "announcement" logic, but maybe we need generic group logic?)

-- Existing "Users can view chats they are part of" covers "is_chat_member".
-- But for "Discover Groups", we need to see groups we are NOT part of, if they are in the community.
-- "Community.tsx" fetches these using `select * from chats where community_id = X`.
-- RLS must allow this.

drop policy if exists "Community groups are viewable by everyone" on chats;
create policy "Community groups are viewable by everyone"
  on chats for select
  using (
    community_id IS NOT NULL 
    AND type = 'group'
    -- You might want to restrict this to "Community Members" only? 
    -- But for "Discover" before joining, it might need to be public?
    -- Prompt says "listing available groups...". Implies visibility.
  );

-- 4. Fix fetchCandidateGroups issue?
-- The query `is('community_id', null)` relies on being able to see the chat.
-- "Users can view chats they are part of" -> covers it.

-- 5. Fix community_members sync trigger (Optional but robust)
-- If we want `is_community_member` to use the table, we update the function.
-- But for now, let's keep the function using chats to be safe, or update it to use the table?
-- Using the table is cleaner.
create or replace function public.is_community_member(target_community_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 
    from public.community_members
    where community_id = target_community_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;
