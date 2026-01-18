
export interface Story {
    id: string;
    user_id: string;
    media_url: string;
    media_type: 'image' | 'video' | 'text';
    caption?: string;
    visibility: 'public' | 'followers' | 'campus';
    created_at: string;
    expires_at: string;
    profiles: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string;
    };
    is_viewed?: boolean;
}

export interface StoryGroup {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    stories: Story[];
    has_unseen: boolean;
    latest_timestamp: string;
}
