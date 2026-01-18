
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
    const { uploadStory } = useStorySystem();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [visibility, setVisibility] = useState("public");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const handlePost = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            await uploadStory(file, caption, visibility);
            onOpenChange(false);
            // Reset
            setFile(null);
            setPreview(null);
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
            <DialogContent className="sm:max-w-md bg-black border-zinc-800 p-0 overflow-hidden h-full md:h-auto md:aspect-[9/16] max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="absolute top-4 left-4 z-50">
                    {!isUploading && (
                        <button onClick={() => onOpenChange(false)} className="bg-black/40 p-2 rounded-full text-white backdrop-blur">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-zinc-900 flex items-center justify-center relative">
                    {preview ? (
                        <img src={preview} className="w-full h-full object-contain" alt="preview" />
                    ) : (
                        <div className="text-center p-8">
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-20 w-20 rounded-full bg-zinc-800 border-zinc-700">
                                <ImageIcon className="h-8 w-8 text-zinc-400" />
                            </Button>
                            <p className="mt-4 text-zinc-500">Select Media</p>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-4">
                    <Input
                        placeholder="Add a caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-white"
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
                        </div>

                        <Button
                            onClick={handlePost}
                            disabled={!file || isUploading}
                            className="rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                        >
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFile} />
            </DialogContent>
        </Dialog>
    );
};
