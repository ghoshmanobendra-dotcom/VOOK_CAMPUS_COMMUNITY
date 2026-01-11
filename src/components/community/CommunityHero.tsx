import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Users, GraduationCap, Building2, Trophy, Palette, Gamepad2, Heart, Music } from "lucide-react";

interface CommunityHeroProps {
    onCreateClick: () => void;
    onTemplateClick: (templateId: string) => void;
}

export const templates = [
    { id: 'college', name: 'College', icon: GraduationCap, color: 'bg-orange-100 text-orange-600' },
    { id: 'business', name: 'Business', icon: Building2, color: 'bg-pink-100 text-pink-600' },
    { id: 'sports', name: 'Sports', icon: Trophy, color: 'bg-blue-100 text-blue-600' },
    { id: 'life', name: 'Life events', icon: Heart, color: 'bg-green-100 text-green-600' },
    { id: 'arts', name: 'Arts & culture', icon: Palette, color: 'bg-cyan-100 text-cyan-600' },
    { id: 'gaming', name: 'Gaming', icon: Gamepad2, color: 'bg-purple-100 text-purple-600' },
];

const CommunityHero = ({ onCreateClick, onTemplateClick }: CommunityHeroProps) => {
    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white p-8 min-h-[400px] flex flex-col justify-center shadow-2xl mb-8">

            {/* Background Shapes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ scale: [1, 1.5, 1], x: [0, 50, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"
                />
            </div>

            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                {/* Left Content */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                            Build your<br />community
                        </h1>
                        <p className="text-indigo-200 text-lg max-w-sm">
                            Bring your community together in one place to plan events, stay organized and get more done.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Button
                            onClick={onCreateClick}
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-12 px-8 font-semibold shadow-lg shadow-indigo-900/50 transition-all hover:scale-105"
                        >
                            Create your own
                        </Button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="pt-4"
                    >
                        <p className="text-sm text-indigo-300 mb-3 font-medium">Create with a template</p>
                        <div className="flex flex-wrap gap-2">
                            {templates.slice(0, 3).map((t, i) => (
                                <button
                                    key={t.id}
                                    onClick={() => onTemplateClick(t.id)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all border border-white/10 backdrop-blur-sm text-sm"
                                >
                                    <t.icon className="w-4 h-4" />
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Right Content - 3D Floating Cards */}
                <div className="hidden md:block relative h-[400px]">
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        {/* Back Card */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-10 right-10 w-64 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rotate-6"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-green-300" />
                                </div>
                                <div>
                                    <div className="h-2 w-24 bg-white/20 rounded mb-1" />
                                    <div className="h-2 w-16 bg-white/10 rounded" />
                                </div>
                            </div>
                            <div className="h-20 bg-white/5 rounded-xl mb-2" />
                            <div className="flex gap-2">
                                <div className="h-8 bg-indigo-500/50 rounded-lg flex-1" />
                                <div className="h-8 bg-white/10 rounded-lg w-12" />
                            </div>
                        </motion.div>

                        {/* Front Card */}
                        <motion.div
                            animate={{ y: [0, 15, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute bottom-20 left-10 w-72 p-5 rounded-2xl bg-white text-slate-900 shadow-2xl -rotate-3"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">Volunteers</h3>
                                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">Active</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                        <Heart className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">Fundraiser</div>
                                        <div className="text-xs text-slate-500">Tomorrow, 10 AM</div>
                                    </div>
                                </div>
                                <div className="flex -space-x-2 pt-2">
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300" />
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-400" />
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">+5</div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default CommunityHero;
