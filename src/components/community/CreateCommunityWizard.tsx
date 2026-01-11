import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { templates } from "./CommunityHero";

interface CreateCommunityWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { name: string; description: string; templateId?: string }) => void;
    isLoading: boolean;
    initialTemplateId?: string | null;
}

const CreateCommunityWizard = ({ open, onOpenChange, onSubmit, isLoading, initialTemplateId }: CreateCommunityWizardProps) => {
    const [step, setStep] = useState<"selection" | "details">("selection");
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "" });

    // Handle initial template or reset on open
    useEffect(() => {
        if (open) {
            if (initialTemplateId) {
                handleTemplateSelect(initialTemplateId);
            } else {
                setStep("selection");
                setSelectedTemplate(null);
                setFormData({ name: "", description: "" });
            }
        }
    }, [open, initialTemplateId]);

    const handleTemplateSelect = (id: string | null) => {
        setSelectedTemplate(id);
        if (id) {
            const template = templates.find(t => t.id === id);
            if (template) {
                setFormData(prev => ({
                    ...prev,
                    name: prev.name || `${template.name} Community`,
                    description: prev.description || `A community for ${template.name.toLowerCase()} enthusiasts.`
                }));
            }
        } else {
            // Create my own
            setFormData({ name: "", description: "" });
        }
        setStep("details");
    };

    const handleSubmit = () => {
        onSubmit({
            name: formData.name,
            description: formData.description,
            templateId: selectedTemplate || undefined
        });
    };

    const handleBack = () => {
        setStep("selection");
        setSelectedTemplate(null);
    };

    // Reset state on close
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setTimeout(() => {
                setStep("selection");
                setFormData({ name: "", description: "" });
                setSelectedTemplate(null);
            }, 300);
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl p-0 gap-0 bg-background/95 backdrop-blur-xl border-border overflow-hidden rounded-2xl h-[600px] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                        {step === "details" && (
                            <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-8 w-8 hover:bg-background/50">
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                        )}
                        <DialogTitle className="text-xl font-semibold">
                            {step === "selection" ? "Create a community" : "Community Details"}
                        </DialogTitle>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                    <AnimatePresence mode="wait">
                        {step === "selection" ? (
                            <motion.div
                                key="selection"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                {/* Create Custom Option */}
                                <div
                                    onClick={() => handleTemplateSelect(null)}
                                    className="group relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-2 border-dashed border-indigo-500/20 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 rounded-2xl p-6 cursor-pointer transition-all duration-300"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 group-hover:bg-indigo-500 text-indigo-500 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm">
                                            <Plus className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-foreground group-hover:text-indigo-600 transition-colors">Create my own</h3>
                                            <p className="text-muted-foreground mt-1">Start from scratch and customize it exactly how you want.</p>
                                        </div>
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Templates Grid */}
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Start with a template</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {templates.map((template) => (
                                            <motion.div
                                                key={template.id}
                                                whileHover={{ y: -4, scale: 1.02 }}
                                                onClick={() => handleTemplateSelect(template.id)}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-xl border border-border cursor-pointer transition-all bg-card hover:shadow-md",
                                                    "hover:border-primary/50 group"
                                                )}
                                            >
                                                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center transition-colors", template.color)}>
                                                    <template.icon className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{template.name}</h4>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="max-w-md mx-auto py-8 space-y-6"
                            >
                                {/* Icon Preview */}
                                <div className="flex justify-center mb-8">
                                    <div className={cn(
                                        "w-24 h-24 rounded-3xl flex items-center justify-center text-4xl shadow-xl",
                                        selectedTemplate
                                            ? templates.find(t => t.id === selectedTemplate)?.color.replace('text-', 'bg-').replace('100', '500 text-white') || "bg-indigo-500 text-white"
                                            : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                                    )}>
                                        {selectedTemplate
                                            ? (() => {
                                                const Icon = templates.find(t => t.id === selectedTemplate)?.icon;
                                                return Icon ? <Icon className="w-10 h-10" /> : formData.name[0] || <Plus className="w-10 h-10" />;
                                            })()
                                            : formData.name[0]?.toUpperCase() || <Plus className="w-10 h-10" />
                                        }
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Community Name</label>
                                        <Input
                                            value={formData.name}
                                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Acme Corp Team"
                                            className="h-12 bg-muted/50 text-lg"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Description</label>
                                        <Textarea
                                            value={formData.description}
                                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="What is this community about?"
                                            className="min-h-[100px] bg-muted/50 resize-none"
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={!formData.name.trim() || isLoading}
                                            className="w-full h-12 text-lg rounded-xl font-semibold shadow-lg shadow-primary/20"
                                        >
                                            {isLoading ? "Creating..." : "Create Community"}
                                        </Button>
                                        <p className="text-center text-xs text-muted-foreground mt-4">
                                            By creating a community, you agree to our Terms of Service.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreateCommunityWizard;
