
import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Image as ImageIcon, Globe, Users, Lock, Send, Loader2 } from "lucide-react";
import { useStorySystem } from "./useStorySystem";

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
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handlePost = async () => {
        if (files.length === 0) return;
        setIsUploading(true);
        try {
            await uploadStories(files, caption, visibility);
            onOpenChange(false);
            // Reset
            setFiles([]);
            setPreviews([]);
            setCaption("");
        } catch (e) {
            // toast handled in hook
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!isUploading) onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-md bg-black border-zinc-800 p-0 overflow-hidden h-full md:h-auto md:max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="absolute top-4 left-4 z-50">
                    {!isUploading && (
                        <button onClick={() => onOpenChange(false)} className="bg-black/40 p-2 rounded-full text-white backdrop-blur hover:bg-black/60 transition">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-zinc-900 overflow-y-auto min-h-[300px] flex flex-col">
                    {files.length > 0 ? (
                        <div className="flex-1 p-4 grid grid-cols-2 gap-2 overflow-y-auto">
                            {previews.map((src, idx) => (
                                <div key={idx} className="relative aspect-[9/16] rounded-lg overflow-hidden group">
                                    {files[idx].type.startsWith('video') ? (
                                        <video src={src} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={src} className="w-full h-full object-cover" alt="preview" />
                                    )}
                                    <button
                                        onClick={() => removeFile(idx)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            {/* Add More Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-[9/16] rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-2 hover:bg-zinc-800 transition"
                            >
                                <ImageIcon className="h-6 w-6 text-zinc-500" />
                                <span className="text-xs text-zinc-500">Add</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8">
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-24 w-24 rounded-full bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:text-white transition-all scale-100 hover:scale-105 active:scale-95">
                                <ImageIcon className="h-10 w-10 text-zinc-400" />
                            </Button>
                            <p className="mt-6 text-zinc-400 font-medium">Select Photos or Videos</p>
                            <p className="text-zinc-600 text-sm mt-1">Support multiple selection</p>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4 z-50">
                    <Input
                        placeholder="Add a caption (applies to first/all)..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-zinc-700"
                    />

                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <select
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value)}
                                className="bg-zinc-900 text-white text-xs p-2 rounded border border-zinc-800 outline-none focus:ring-1 ring-white/20"
                            >
                                <option value="public">Public</option>
                                <option value="followers">Followers</option>
                                <option value="campus">Campus</option>
                            </select>
                            {files.length > 0 && <span className="text-zinc-500 text-xs self-center">{files.length} selected</span>}
                        </div>

                        <Button
                            onClick={handlePost}
                            disabled={files.length === 0 || isUploading}
                            className="rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold transition-all px-6"
                        >
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={handleFile} />
            </DialogContent>
        </Dialog>
    );
};
