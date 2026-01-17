import { useState, useRef } from "react";
import {
    Bold, Italic, Underline, Strikethrough, List, Quote, Code, Link as LinkIcon, MoreHorizontal,
    Smile, Image as ImageIcon, Paperclip, Plus, X, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; // Using sonner as seen in other files
import { usePosts } from "@/context/PostContext";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CommunityPostEditorProps {
    communityId: string; // Not strictly needed if we use global context/current community, but good for safety
    communityName: string;
    onCancel: () => void;
    onSuccess: () => void;
    defaultType?: "post" | "announcement";
}

const CommunityPostEditor = ({ communityId, communityName, onCancel, onSuccess, defaultType = "post" }: CommunityPostEditorProps) => {
    const { addPost, currentUser } = usePosts();
    const [postType, setPostType] = useState<"post" | "announcement">(defaultType);
    const [subject, setSubject] = useState("");
    const [subheading, setSubheading] = useState(""); // Only for announcement
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Attachments
    const [attachments, setAttachments] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Emoji
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleEmojiClick = (emojiData: any) => {
        setContent(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    const handleSubmit = async () => {
        if (!content.trim() && attachments.length === 0) {
            toast.error("Please enter some content or add an attachment.");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Upload Attachments
            const imageUrls: string[] = [];
            for (const file of attachments) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                imageUrls.push(publicUrl);
            }

            // 2. Format Body
            // Combine Subject/Subheading into content if needed, or rely on just content. 
            // Since `feed` doesn't support separate titles, we'll prepend them.
            let finalContent = content;
            if (postType === 'announcement') {
                if (subject) finalContent = `**${subject.toUpperCase()}**\n${subheading ? `*${subheading}*\n\n` : '\n'}${content}`;
            } else {
                if (subject) finalContent = `**${subject}**\n\n${content}`;
            }

            // 3. Create Post via Context
            const success = await addPost({
                content: finalContent,
                images: imageUrls,
                author: currentUser,
                communityId: communityId,
                postType: 'community',
                communityTag: communityName, // Tagging with community name
                isOfficial: postType === 'announcement',
                isAnonymous: false, // Defaulting for visual consistency with request
                hasVideo: false, // Simple assumption for now
                videoThumbnail: undefined
            });

            if (success) {
                toast.success("Post created successfully!");
                onSuccess();
            }

        } catch (error: any) {
            console.error("Post creation failed:", error);
            toast.error("Failed to post: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-background border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* 1. Editor Header / Type Selector (Implicit in design) */}
            {/* If Announcement, show colored banner */}
            {postType === 'announcement' && (
                <div className="bg-[#005a9e] p-4 text-white">
                    {/* Using blue/teams color */}
                    <Input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Type a headline"
                        className="text-2xl font-bold bg-transparent border-none placeholder:text-white/70 text-white focus-visible:ring-0 px-0 h-auto"
                    />
                    <Input
                        value={subheading}
                        onChange={e => setSubheading(e.target.value)}
                        placeholder="Add a subheading"
                        className="text-sm bg-transparent border-none placeholder:text-white/70 text-white focus-visible:ring-0 px-0 h-auto mt-1"
                    />
                </div>
            )}

            <div className="p-4 space-y-4">
                {/* Standard Post Subject */}
                {postType === 'post' && (
                    <Input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Add a subject"
                        className="text-lg font-semibold border-none px-0 shadow-none focus-visible:ring-0 rounded-none border-b border-border/50"
                    />
                )}

                {/* Toolbar */}
                <div className="flex items-center gap-1 border-b border-border/50 pb-2 overflow-x-auto">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Bold className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Italic className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Underline className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Strikethrough className="w-4 h-4" /></Button>
                    <div className="w-[1px] h-6 bg-border mx-1" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><List className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Quote className="w-4 h-4" /></Button>
                    <div className="w-[1px] h-6 bg-border mx-1" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><LinkIcon className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Code className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></Button>
                </div>

                {/* Text Area */}
                <Textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Type a message"
                    className="min-h-[150px] border-none resize-none px-0 shadow-none focus-visible:ring-0 text-base"
                />

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {attachments.map((file, i) => (
                            <div key={i} className="relative group bg-muted rounded-lg p-2 pr-8 text-xs flex items-center gap-2 border border-border">
                                <Paperclip className="w-3 h-3 text-muted-foreground" />
                                <span className="max-w-[150px] truncate">{file.name}</span>
                                <button
                                    onClick={() => removeAttachment(i)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded-full"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        {/* Emoji */}
                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted">
                                    <Smile className="w-5 h-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-none shadow-none bg-transparent" side="top" align="start">
                                <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.AUTO} width={300} height={400} />
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImageIcon className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Paperclip className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted"
                        >
                            <Plus className="w-5 h-5" />
                        </Button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            onChange={handleFileSelect}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Cancel Button */}
                        <Button variant="ghost" onClick={onCancel}>Cancel</Button>

                        {/* Post Button */}
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || (!content.trim() && attachments.length === 0)}
                            className="bg-[#5b5fc7] hover:bg-[#4f52b2] text-white px-6"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Post
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunityPostEditor;
