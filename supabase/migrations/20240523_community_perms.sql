-- 1. Helper function to check if user is a member of ANY group in a community
create or replace function public.is_community_member(target_community_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 
    from public.chats c
    join public.chat_participants cp on cp.chat_id = c.id
    where c.community_id = target_community_id
    and c.type = 'group'
    and cp.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 2. Update Chats Policy: Allow viewing announcement chats if member of community
-- Also allow if created_by (owner)
drop policy if exists "Users can view chats they are part of" on chats;
create policy "Users can view chats they are part of"
  on chats for select
  using (
    created_by = auth.uid()
    OR public.is_chat_member(id)
    OR (
       is_announcement = true 
       AND community_id IS NOT NULL 
       AND public.is_community_member(community_id)
    )
  );

-- 3. Update Messages View Policy
drop policy if exists "Users can view messages in their chats" on messages;
create policy "Users can view messages in their chats"
  on messages for select
  using (
    public.is_chat_member(chat_id)
    OR (
       exists (
         select 1 from public.chats c
         where c.id = chat_id
         and c.created_by = auth.uid()
       )
    )
    OR (
       exists (
         select 1 from public.chats c
         where c.id = chat_id
         and c.is_announcement = true
         and c.community_id IS NOT NULL
         and public.is_community_member(c.community_id)
       )
    )
  );

-- 4. Update Messages INSERT Policy (Fix for "Failed to send message")
drop policy if exists "Users can send messages to their chats" on messages;
create policy "Users can send messages to their chats"
  on messages for insert
  with check (
    auth.uid() = sender_id
    AND (
      public.is_chat_member(chat_id)
      OR (
        -- Allow creator to send even if not in participants (fallback)
        exists (select 1 from public.chats where id = chat_id and created_by = auth.uid())
      )
    )
  );
