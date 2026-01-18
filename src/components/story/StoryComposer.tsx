
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, Image as ImageIcon, Send, Loader2, Globe, Users, GraduationCap, Plus, Trash2 } from "lucide-react";
import { useStorySystem } from "./useStorySystem";
import { cn } from "@/lib/utils";

interface StoryComposerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const StoryComposer = ({ open, onOpenChange }: StoryComposerProps) => {
    const { uploadStories } = useStorySystem();
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [caption, setCaption] = useState("");
    const [visibility, setVisibility] = useState("public");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state on close
    useEffect(() => {
        if (!open) {
            setFiles([]);
            setPreviews([]);
            setCaption("");
            setVisibility("public");
        }
    }, [open]);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);

            // Create previews
            const newPreviews = newFiles.map(f => URL.createObjectURL(f));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (index: number) => {
        if (files.length === 1) {
            // If removing last file, just clear
            setFiles([]);
            setPreviews([]);
        } else {
            setFiles(prev => prev.filter((_, i) => i !== index));
            setPreviews(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handlePost = async () => {
        if (files.length === 0) return;
        setIsUploading(true);
        try {
            await uploadStories(files, caption, visibility);
            onOpenChange(false);
        } catch (e) {
            // toast handled in hook
        } finally {
            setIsUploading(false);
        }
    };

    if (!open) return null;

    // Fullscreen Overlay
    return createPortal(
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col animate-in fade-in duration-300">

            {/* Header Controls */}
            <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
                <button
                    onClick={() => onOpenChange(false)}
                    className="pointer-events-auto bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/60 transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>

                {/* Top Right Tools (Placeholder for now) */}
                {files.length > 0 && (
                    <div className="pointer-events-auto flex gap-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full">
                        <span className="text-white font-bold tracking-wider">STORY</span>
                    </div>
                )}
            </div>

            {/* Main Content / Canvas */}
            <div className="flex-1 relative flex items-center justify-center bg-zinc-900 overflow-hidden">
                {files.length === 0 ? (
                    // Empty State
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in-50 duration-500">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-700 hover:scale-105 transition-all group"
                        >
                            <div className="relative">
                                <ImageIcon className="h-10 w-10 text-zinc-400 group-hover:text-white transition-colors" />
                                <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-1">
                                    <Plus className="h-3 w-3 text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-white text-lg font-medium">Add to Story</h3>
                            <p className="text-zinc-500 text-sm">Photos or Videos</p>
                        </div>
                    </div>
                ) : (
                    // Preview Carousel / Grid
                    <div className="w-full h-full p-4 md:p-8 flex items-center justify-center overflow-x-auto gap-4 snap-x">
                        {previews.map((src, idx) => (
                            <div key={idx} className="relative shrink-0 w-full md:w-[350px] aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-2xl snap-center animate-in slide-in-from-bottom duration-500 border border-white/10 group">
                                {files[idx].type.startsWith('video') ? (
                                    <video src={src} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                ) : (
                                    <img src={src} className="w-full h-full object-cover" alt="preview" />
                                )}

                                {/* Remove Button */}
                                <button
                                    onClick={() => removeFile(idx)}
                                    className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>

                                {/* Index Badge */}
                                <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 text-white text-[10px] rounded-full backdrop-blur font-mono">
                                    {idx + 1}/{files.length}
                                </div>
                            </div>
                        ))}
                        {/* Add More Slide */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative shrink-0 w-[100px] md:w-[350px] aspect-[9/16] bg-zinc-800/50 rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors border-2 border-dashed border-zinc-700 snap-center"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <Plus className="h-8 w-8 text-zinc-500" />
                                <span className="text-zinc-500 text-xs">Add</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            {files.length > 0 && (
                <div className="p-4 md:p-6 pb-8 bg-gradient-to-t from-black via-black/90 to-transparent pt-20 animate-in slide-in-from-bottom duration-300">
                    <div className="max-w-md mx-auto flex flex-col gap-4">

                        {/* Caption Input */}
                        <div className="relative">
                            <input
                                placeholder="Add a caption..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="w-full bg-transparent border-0 text-white placeholder:text-white/70 text-center text-lg focus:ring-0 focus:outline-none"
                            />
                        </div>

                        {/* Visibility Pills */}
                        <div className="flex justify-center gap-2 py-2">
                            <button
                                onClick={() => setVisibility("public")}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all active:scale-95",
                                    visibility === "public" ? "bg-white text-black" : "bg-zinc-800/80 text-white backdrop-blur border border-white/10"
                                )}
                            >
                                <Globe className="h-3 w-3" /> Public
                            </button>
                            <button
                                onClick={() => setVisibility("followers")}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all active:scale-95",
                                    visibility === "followers" ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent" : "bg-zinc-800/80 text-white backdrop-blur border border-white/10"
                                )}
                            >
                                <Users className="h-3 w-3" /> Followers
                            </button>
                            <button
                                onClick={() => setVisibility("campus")}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all active:scale-95",
                                    visibility === "campus" ? "bg-blue-500 text-white border-transparent" : "bg-zinc-800/80 text-white backdrop-blur border border-white/10"
                                )}
                            >
                                <GraduationCap className="h-3 w-3" /> Campus
                            </button>
                        </div>

                        {/* Post Button (FAB-like) */}
                        <div className="flex justify-end mt-2">
                            <Button
                                onClick={handlePost}
                                disabled={isUploading}
                                className="rounded-full h-12 px-6 bg-white hover:bg-white/90 text-black font-bold shadow-lg shadow-white/10 transition-all active:scale-90"
                            >
                                {isUploading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span>Share</span>
                                        <Send className="h-4 w-4" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                multiple
                onChange={handleFile}
            />
        </div>,
        document.body
    );
};
