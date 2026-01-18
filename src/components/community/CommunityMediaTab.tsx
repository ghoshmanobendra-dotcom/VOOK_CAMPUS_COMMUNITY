import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, Image as ImageIcon, Download, ExternalLink, Video } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CommunityMediaTabProps {
    communityId: string;
    type: 'files' | 'photos';
}

const CommunityMediaTab = ({ communityId, type }: CommunityMediaTabProps) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewItem, setPreviewItem] = useState<any>(null);

    useEffect(() => {
        fetchMedia();
    }, [communityId, type]);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            // Determine filter based on tab type
            const typeFilter = type === 'photos' ? ['image', 'video'] : ['file'];

            const { data, error } = await supabase
                .from('community_media')
                .select('*')
                .eq('community_id', communityId)
                .in('media_type', typeFilter)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error("Error fetching media:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                {type === 'files' ? (
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                ) : (
                    <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                )}
                <h3 className="text-lg font-medium text-foreground">No {type} yet</h3>
                <p className="text-sm">
                    {type === 'files'
                        ? "Documents shared in posts will appear here."
                        : "Photos and videos shared in posts will appear here."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {type === 'photos' ? (
                // Grid for Photos/Videos
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="group relative aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer border border-border/50 hover:border-primary/50 transition-all"
                            onClick={() => setPreviewItem(item)}
                        >
                            {item.media_type === 'video' ? (
                                <div className="w-full h-full flex items-center justify-center bg-black/5">
                                    <Video className="w-8 h-8 text-muted-foreground" />
                                    {/* Ideally we'd have a thumbnail here */}
                                    <video src={item.media_url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                </div>
                            ) : (
                                <img
                                    src={item.media_url}
                                    alt="Community media"
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    loading="lazy"
                                />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </div>
                    ))}
                </div>
            ) : (
                // List for Files
                <div className="grid gap-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:bg-muted/50 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate pr-4">
                                    {item.media_url.split('/').pop()?.split('?')[0] || "Unnamed File"}
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                    Shared on {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <a
                                href={item.media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Download className="w-4 h-4" />
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {/* Media Preview Dialog */}
            <Dialog open={!!previewItem} onOpenChange={(v) => !v && setPreviewItem(null)}>
                <DialogContent className="max-w-4xl p-0 bg-black/90 border-none overflow-hidden flex items-center justify-center h-[80vh]">
                    {previewItem && (
                        previewItem.media_type === 'video' ? (
                            <video
                                src={previewItem.media_url}
                                controls
                                className="max-w-full max-h-full rounded-md"
                                autoPlay
                            />
                        ) : (
                            <img
                                src={previewItem.media_url}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain rounded-md"
                            />
                        )
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CommunityMediaTab;
