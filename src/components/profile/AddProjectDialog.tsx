import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddProjectDialogProps {
    userId: string;
    onProjectAdded: () => void;
}

const AddProjectDialog = ({ userId, onProjectAdded }: AddProjectDialogProps) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        github_link: "",
        live_link: "",
        technologies: "",
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => {
                setImagePreview(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `projects/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageUrl = null;
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            const techArray = formData.technologies
                .split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0);

            const { error } = await supabase.from('projects').insert({
                user_id: userId,
                title: formData.title,
                description: formData.description,
                github_link: formData.github_link || null,
                live_link: formData.live_link || null,
                technologies: techArray,
                image_url: imageUrl
            });

            if (error) throw error;

            toast.success("Project added successfully!");
            setOpen(false);

            // Reset form
            setFormData({
                title: "",
                description: "",
                github_link: "",
                live_link: "",
                technologies: "",
            });
            setImageFile(null);
            setImagePreview(null);

            onProjectAdded();

        } catch (error: any) {
            console.error("Error adding project:", error);
            toast.error(error.message || "Failed to add project");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full h-full min-h-[250px] border-dashed border-2 border-muted-foreground/20 bg-muted/5 hover:bg-muted/10 flex flex-col items-center justify-center gap-2 group rounded-xl">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="h-8 w-8 text-primary" />
                    </div>
                    <span className="font-medium text-muted-foreground group-hover:text-foreground">Add New Project</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Add Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label>Project Image</Label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer overflow-hidden bg-muted/30 flex items-center justify-center transition-colors"
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <ImageIcon className="h-8 w-8" />
                                    <span className="text-xs">Click to upload image</span>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                        {imagePreview && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-500 h-6 px-2 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setImageFile(null);
                                    setImagePreview(null);
                                }}
                            >
                                Remove Image
                            </Button>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Project Name</Label>
                        <Input
                            id="title"
                            required
                            placeholder="My Awesome App"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="What does this project do?"
                            className="resize-none h-24"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="github">GitHub Repo</Label>
                            <Input
                                id="github"
                                placeholder="https://github.com/..."
                                value={formData.github_link}
                                onChange={e => setFormData({ ...formData, github_link: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="live">Live Link</Label>
                            <Input
                                id="live"
                                placeholder="https://..."
                                value={formData.live_link}
                                onChange={e => setFormData({ ...formData, live_link: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tech">Technologies (comma separated)</Label>
                        <Input
                            id="tech"
                            placeholder="React, Supabase, Tailwind..."
                            value={formData.technologies}
                            onChange={e => setFormData({ ...formData, technologies: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddProjectDialog;
