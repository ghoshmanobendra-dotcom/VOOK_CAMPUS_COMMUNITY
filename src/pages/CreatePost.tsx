
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Clock, Image as ImageIcon, Plus, Sparkles, Globe, Users, Lock, ChevronDown, Calendar, ChevronRight, FileText, BarChart2, Video, Paperclip, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose, DrawerTitle, DrawerDescription, DrawerHeader, DrawerFooter } from "@/components/ui/drawer";
import { usePosts } from "@/context/PostContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const CreatePost = () => {
    const navigate = useNavigate();
    const { addPost, currentUser } = usePosts();
    const [content, setContent] = useState("");
    const [visibility, setVisibility] = useState("Anyone");
    const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
    const [scheduleTime, setScheduleTime] = useState("");

    // Attachments State
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<File[]>([]);

    // Poll State
    const [isPollActive, setIsPollActive] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setSelectedImages((prev) => [...prev, event.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedDocs((prev) => [...prev, e.target.files![0]]);
        }
    };

    const handleAddPollOption = () => {
        if (pollOptions.length < 4) {
            setPollOptions([...pollOptions, ""]);
        }
    };

    const [isRewriting, setIsRewriting] = useState(false);

    const handleRewrite = () => {
        if (!content.trim()) {
            toast.error("Please write something first!");
            return;
        }

        setIsRewriting(true);

        // Simulate AI processing
        setTimeout(() => {
            const enhancements = [
                "\n\n🚀 excited to see where this goes! #Innovation #Growth",
                "\n\n✨ Truly a game changer in the industry.",
                "\n\n💡 Thoughts on this? Let's discuss below! 👇",
                "\n\n🔥 Keep pushing boundaries!"
            ];
            const randomEnhancement = enhancements[Math.floor(Math.random() * enhancements.length)];

            setContent((prev) => prev + randomEnhancement);
            setIsRewriting(false);
            toast.success("Content polished by AI ✨");
        }, 1500);
    };

    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async () => {
        if (!content.trim() && selectedImages.length === 0 && !isPollActive && selectedDocs.length === 0) return;

        if (scheduleDate) {
            toast.success("Post scheduled for " + format(scheduleDate, "PPP") + " at " + (scheduleTime || "9:00 AM"));
            navigate("/");
            return;
        }

        setIsPosting(true);
        const newPost = {
            author: {
                name: currentUser.name,
                username: currentUser.username,
                initials: currentUser.initials,
                college: currentUser.college,
                avatar: currentUser.avatar,
                id: currentUser.id || ""
            },
            communityTag: visibility === "Anyone" ? "Public" : visibility,
            content: content,
            images: selectedImages.length > 0 ? selectedImages : undefined,
            documents: selectedDocs.length > 0 ? selectedDocs.map(f => ({
                name: f.name,
                size: (f.size / 1024).toFixed(1) + " KB",
                url: "#",
                type: f.name.split('.').pop() || "FILE"
            })) : undefined,
            poll: isPollActive ? {
                question: pollQuestion,
                options: pollOptions.filter(o => o.trim() !== "").map(text => ({ text, percentage: 0 })),
                totalVotes: 0
            } : undefined
        };

        const success = await addPost(newPost);
        setIsPosting(false);

        if (success) {
            toast.success("Post created successfully!");
            navigate("/");
        }
    };


    const [suggestions, setSuggestions] = useState<string[]>([]);

    // Smart Suggestions Logic
    useEffect(() => {
        const text = content.toLowerCase();
        const newSuggestions: string[] = [];

        if (text.includes("launch") || text.includes("project") || text.includes("built")) {
            newSuggestions.push("#NewBeginnings", "🚀 Launch Day", "#TechInnovation", "Check this out!");
        }
        if (text.includes("hiring") || text.includes("job") || text.includes("opportunity")) {
            newSuggestions.push("#Hiring", "🤝 Networking", "#CareerGrowth", "Dm for info");
        }
        if (text.includes("event") || text.includes("meetup") || text.includes("hackathon")) {
            newSuggestions.push("#Community", "📅 Save the Date", "Register Now!", "#TechMeetup");
        }
        if (text.includes("learn") || text.includes("study") || text.includes("guide")) {
            newSuggestions.push("#Learning", "📚 KnowledgeShare", "#StudentLife", "Tips & Tricks");
        }

        // Default suggestions if user has started typing but no specific keywords found
        if (newSuggestions.length === 0 && text.length > 5) {
            newSuggestions.push("#Trending", "#Innovation", "Thoughts?", "#CampusLife");
        }

        setSuggestions(newSuggestions);
    }, [content]);

    const addSuggestion = (suggestion: string) => {
        setContent(prev => prev + " " + suggestion);
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Hidden Inputs */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />
            <input
                type="file"
                ref={docInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleDocSelect}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="-ml-2" onClick={() => navigate("/")}>
                        <X className="h-6 w-6" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={currentUser.avatar} />
                            <AvatarFallback>{currentUser.initials}</AvatarFallback>
                        </Avatar>
                        <Drawer>
                            <DrawerTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 rounded-full border border-border text-xs font-normal">
                                    {visibility} <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent className="bg-card border-border">
                                <div className="mx-auto w-full max-w-sm">
                                    <DrawerHeader>
                                        <DrawerTitle className="text-foreground">Who can see your post?</DrawerTitle>
                                        <DrawerDescription>Your post will be visible based on this setting.</DrawerDescription>
                                    </DrawerHeader>
                                    <div className="p-4 space-y-4">
                                        <div
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${visibility === "Anyone" ? "bg-muted" : "hover:bg-muted/50"}`}
                                            onClick={() => setVisibility("Anyone")}
                                        >
                                            <div className="p-2 rounded-full bg-muted border border-border"><Globe className="h-5 w-5 text-foreground" /></div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-foreground">Anyone</p>
                                                <p className="text-xs text-muted-foreground">Anyone on or off Campus</p>
                                            </div>
                                            {visibility === "Anyone" && <div className="h-4 w-4 rounded-full border-4 border-primary" />}
                                        </div>
                                        <div
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${visibility === "Campus Only" ? "bg-muted" : "hover:bg-muted/50"}`}
                                            onClick={() => setVisibility("Campus Only")}
                                        >
                                            <div className="p-2 rounded-full bg-muted border border-border"><Building2 className="h-5 w-5 text-foreground" /></div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-foreground">Campus Only</p>
                                                <p className="text-xs text-muted-foreground">Only students from your campus</p>
                                            </div>
                                            {visibility === "Campus Only" && <div className="h-4 w-4 rounded-full border-4 border-primary" />}
                                        </div>
                                        <div
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${visibility === "Followers only" ? "bg-muted" : "hover:bg-muted/50"}`}
                                            onClick={() => setVisibility("Followers only")}
                                        >
                                            <div className="p-2 rounded-full bg-muted border border-border"><Users className="h-5 w-5 text-foreground" /></div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-foreground">Followers only</p>
                                                <p className="text-xs text-muted-foreground">Followers on Campus Connect</p>
                                            </div>
                                            {visibility === "Followers only" && <div className="h-4 w-4 rounded-full border-4 border-primary" />}
                                        </div>
                                        <div
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${visibility === "Group" ? "bg-muted" : "hover:bg-muted/50"}`}
                                            onClick={() => setVisibility("Group")}
                                        >
                                            <div className="p-2 rounded-full bg-muted border border-border"><Users className="h-5 w-5 text-foreground" /></div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-foreground">Group</p>
                                                <p className="text-xs text-muted-foreground">Select a group</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <DrawerFooter>
                                        <DrawerClose asChild>
                                            <Button className="bg-primary text-primary-foreground">Done</Button>
                                        </DrawerClose>
                                    </DrawerFooter>
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Drawer>
                        <DrawerTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground">
                                <Clock className="h-6 w-6" />
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="bg-card border-border">
                            <div className="mx-auto w-full max-w-sm">
                                <DrawerHeader>
                                    <DrawerTitle className="text-foreground">Schedule Post</DrawerTitle>
                                </DrawerHeader>
                                <div className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Date</label>
                                        <input
                                            type="date"
                                            className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                                            onChange={(e) => setScheduleDate(e.target.value ? new Date(e.target.value) : undefined)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Time</label>
                                        <input
                                            type="time"
                                            className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                                            defaultValue="09:00"
                                            onChange={(e) => setScheduleTime(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-4">
                                        Based on your location (UTC+05:30 Chennai, Kolkata, Mumbai, New Delhi)
                                    </p>
                                </div>
                                <DrawerFooter>
                                    <DrawerClose asChild>
                                        <Button onClick={() => toast.success("Scheduled!")}>Next</Button>
                                    </DrawerClose>
                                </DrawerFooter>
                            </div>
                        </DrawerContent>
                    </Drawer>

                    <Button
                        disabled={(!content.trim() && selectedImages.length === 0 && !isPollActive && selectedDocs.length === 0) || isPosting}
                        onClick={handlePost}
                        className="rounded-full px-6 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 min-w-[80px]"
                    >
                        {isPosting ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            "Post"
                        )}
                    </Button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-4 overflow-y-auto">
                <Textarea
                    placeholder="Share your thoughts..."
                    className="min-h-[150px] text-lg border-none focus-visible:ring-0 resize-none p-0 bg-transparent placeholder:text-muted-foreground/50 font-serif italic text-foreground"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />

                {/* AI Suggestions */}
                {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {suggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                onClick={() => addSuggestion(suggestion)}
                                className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1"
                            >
                                <Sparkles className="h-3 w-3" />
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}

                {/* Previews */}
                <div className="space-y-4 mt-4">
                    {/* Images */}
                    {selectedImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            {selectedImages.map((img, idx) => (
                                <div key={idx} className="relative rounded-lg overflow-hidden group">
                                    <img src={img} alt="preview" className="w-full h-auto object-cover" />
                                    <button
                                        onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Poll */}
                    {isPollActive && (
                        <div className="border border-border rounded-lg p-4 bg-card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-medium text-foreground">Create a Poll</h3>
                                <Button variant="ghost" size="sm" onClick={() => setIsPollActive(false)}><X className="h-4 w-4" /></Button>
                            </div>
                            <div className="space-y-3">
                                <Input
                                    placeholder="Ask a question..."
                                    value={pollQuestion}
                                    onChange={(e) => setPollQuestion(e.target.value)}
                                    className="font-medium bg-background border-border text-foreground"
                                />
                                {pollOptions.map((opt, idx) => (
                                    <Input
                                        key={idx}
                                        placeholder={`Option ${idx + 1}`}
                                        value={opt}
                                        onChange={(e) => {
                                            const newOpts = [...pollOptions];
                                            newOpts[idx] = e.target.value;
                                            setPollOptions(newOpts);
                                        }}
                                        className="bg-background border-border text-foreground"
                                    />
                                ))}
                                {pollOptions.length < 4 && (
                                    <Button variant="outline" size="sm" onClick={handleAddPollOption} className="w-full mt-2 border-border text-foreground">
                                        <Plus className="h-4 w-4 mr-2" /> Add Option
                                    </Button>
                                )}
                            </div>
                            <div className="mt-4 text-xs text-muted-foreground">
                                Poll duration: 1 week (default)
                            </div>
                        </div>
                    )}

                    {/* Documents */}
                    {selectedDocs.length > 0 && (
                        <div className="space-y-2">
                            {selectedDocs.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-primary" />
                                        <div className="text-sm">
                                            <p className="font-medium text-foreground">{doc.name}</p>
                                            <p className="text-xs text-muted-foreground">{(doc.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedDocs(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 flex items-center justify-between bg-card border-t border-border/50">
                <Button
                    variant="outline"
                    className="rounded-full gap-2 border-primary/50 text-foreground font-normal hover:bg-primary/5"
                    onClick={handleRewrite}
                    disabled={isRewriting}
                >
                    <Sparkles className={`h-4 w-4 text-primary ${isRewriting ? "animate-spin" : ""}`} />
                    {isRewriting ? "Rewriting..." : "Rewrite with AI"}
                </Button>

                <div className="flex items-center gap-4">
                    <Drawer>
                        <DrawerTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                <Paperclip className="h-6 w-6" />
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="bg-card border-border">
                            <div className="mx-auto w-full max-w-sm">
                                <DrawerHeader>
                                    <DrawerTitle className="text-foreground">Add to your post</DrawerTitle>
                                </DrawerHeader>
                                <div className="p-4 space-y-2">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start gap-4 h-14 hover:bg-muted"
                                        onClick={() => {
                                            fileInputRef.current?.click();
                                        }}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center text-primary">
                                            <ImageIcon className="h-5 w-5" />
                                        </div>
                                        <span className="font-medium text-lg text-foreground">Media</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start gap-4 h-14 hover:bg-muted"
                                        onClick={() => {
                                            setIsPollActive(true);
                                        }}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center text-primary">
                                            <BarChart2 className="h-5 w-5" />
                                        </div>
                                        <span className="font-medium text-lg text-foreground">Create a poll</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start gap-4 h-14 hover:bg-muted"
                                        onClick={() => {
                                            docInputRef.current?.click();
                                        }}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center text-primary">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <span className="font-medium text-lg text-foreground">Add a document</span>
                                    </Button>
                                </div>
                                <DrawerFooter>
                                    <DrawerClose asChild>
                                        <Button variant="outline" className="border-border text-foreground">Cancel</Button>
                                    </DrawerClose>
                                </DrawerFooter>
                            </div>
                        </DrawerContent>
                    </Drawer>
                </div>
            </div>
        </div>
    );
};

export default CreatePost;
