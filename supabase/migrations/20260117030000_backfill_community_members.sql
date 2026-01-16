-- Backfill community_members using DISTINCT ON to avoid GROUP BY issues
-- This ensures that the member counts are accurate for existing communities

INSERT INTO public.community_members (community_id, user_id, role, joined_at)
SELECT DISTINCT ON (c.community_id, cp.user_id)
    c.community_id,
    cp.user_id,
    'member' as role,
    cp.joined_at
FROM public.chats c
JOIN public.chat_participants cp ON c.id = cp.chat_id
WHERE c.community_id IS NOT NULL
ORDER BY c.community_id, cp.user_id, cp.joined_at ASC
ON CONFLICT (community_id, user_id) DO NOTHING;
