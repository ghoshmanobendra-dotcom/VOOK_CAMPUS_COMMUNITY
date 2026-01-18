import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CommunitySettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    community: any;
    onUpdate: () => void;
}

const CommunitySettingsDialog = ({ isOpen, onClose, community, onUpdate }: CommunitySettingsDialogProps) => {
    const navigate = useNavigate();
    const [name, setName] = useState(community.name);
    const [description, setDescription] = useState(community.description || "");
    const [isPublic, setIsPublic] = useState(community.type === 'public'); // Assuming 'type' or 'privacy' column
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(community.name);
            setDescription(community.description || "");
            setIsPublic(community.type === 'public');
        }
    }, [isOpen, community]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('communities')
                .update({
                    name,
                    description,
                    type: isPublic ? 'public' : 'private'
                })
                .eq('id', community.id);

            if (error) throw error;

            toast.success("Community settings updated");
            onUpdate();
            onClose();
        } catch (error: any) {
            toast.error("Failed to update: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this community? This cannot be undone.")) return;

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('communities')
                .delete()
                .eq('id', community.id);

            if (error) throw error;

            toast.success("Community deleted");
            navigate('/community'); // Redirect home
        } catch (error: any) {
            toast.error("Failed to delete: " + error.message);
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Community Settings</DialogTitle>
                    <DialogDescription>
                        Manage your community details and preferences.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Community Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="desc">Description</Label>
                        <Textarea
                            id="desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">Public Community</Label>
                            <p className="text-xs text-muted-foreground">
                                Anyone can find and join this community.
                            </p>
                        </div>
                        <Switch
                            checked={isPublic}
                            onCheckedChange={setIsPublic}
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="destructive" onClick={handleDelete} type="button" className="mr-auto" size="icon">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CommunitySettingsDialog;
