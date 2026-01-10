import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Shield, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TiltCard from "./TiltCard";

interface TermsModalProps {
    isOpen: boolean;
    onComplete: () => void;
    userId: string;
}

const TermsModal = ({ isOpen, onComplete, userId }: TermsModalProps) => {
    const [isChecked, setIsChecked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showTermsContent, setShowTermsContent] = useState(false);
    const [showPrivacyContent, setShowPrivacyContent] = useState(false);

    const handleAccept = async () => {
        if (!isChecked) return;
        setIsLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ terms_accepted: true })
                .eq('id', userId);

            if (error) throw error;

            toast.success("Welcome to the community!");
            onComplete();
        } catch (error) {
            console.error("Error accepting terms:", error);
            toast.error("Failed to update status. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Terms Content Modal */}
            <AnimatePresence>
                {showTermsContent && (
                    <div className="absolute inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowTermsContent(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-[120]"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <h3 className="text-xl font-bold text-white">Terms and Conditions</h3>
                                <button
                                    onClick={() => setShowTermsContent(false)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                                >
                                    <div className="relative w-5 h-5">
                                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/50 rotate-45 transform -translate-y-1/2 group-hover:bg-white transition-colors" />
                                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/50 -rotate-45 transform -translate-y-1/2 group-hover:bg-white transition-colors" />
                                    </div>
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-white/80 text-sm leading-relaxed custom-scrollbar text-left">
                                <section>
                                    <h4 className="text-primary font-semibold mb-2">1. Eligibility</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>VOOK is for college students only.</li>
                                        <li>You must be 18 years or older.</li>
                                        <li>You agree to provide accurate information during signup.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">2. Account Responsibility</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>You are responsible for all activity on your account.</li>
                                        <li>Do not share your login details.</li>
                                        <li>Impersonation or fake accounts are not allowed.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">3. Anonymous Features</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>VOOK allows optional anonymous posting.</li>
                                        <li>Anonymous means hidden from other users, not from VOOK.</li>
                                        <li>Abuse of anonymity may result in account suspension.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">4. Acceptable Use</h4>
                                    <p className="mb-2">You agree not to:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>Harass, threaten, or abuse others</li>
                                        <li>Post illegal, hateful, or explicit content</li>
                                        <li>Misuse the platform or disrupt communities</li>
                                        <li>VOOK may remove content or restrict access if rules are violated.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">5. Content</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>You own the content you post.</li>
                                        <li>By posting, you allow VOOK to display and manage your content within the app.</li>
                                        <li>VOOK is not responsible for user-generated content.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">6. Account Suspension</h4>
                                    <p className="mb-2">VOOK may suspend or remove accounts that:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>Violate these terms</li>
                                        <li>Harm the community</li>
                                        <li>Are required to be removed by law</li>
                                    </ul>
                                    <p className="mt-2 text-white/60">You may delete your account anytime.</p>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">7. Platform Use</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>VOOK is provided "as is".</li>
                                        <li>We may update features or services at any time.</li>
                                        <li>We do not guarantee uninterrupted access.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">8. Privacy</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>Your data is used only to operate the platform.</li>
                                        <li>VOOK does not sell personal data.</li>
                                        <li>More details are available in our Privacy Policy.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">9. Changes</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>We may update these terms occasionally.</li>
                                        <li>Continued use means you accept the updated terms.</li>
                                    </ul>
                                </section>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Privacy Content Modal */}
            <AnimatePresence>
                {showPrivacyContent && (
                    <div className="absolute inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowPrivacyContent(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-[120]"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <h3 className="text-xl font-bold text-white">Privacy Policy</h3>
                                <button
                                    onClick={() => setShowPrivacyContent(false)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                                >
                                    <div className="relative w-5 h-5">
                                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/50 rotate-45 transform -translate-y-1/2 group-hover:bg-white transition-colors" />
                                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/50 -rotate-45 transform -translate-y-1/2 group-hover:bg-white transition-colors" />
                                    </div>
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-white/80 text-sm leading-relaxed custom-scrollbar text-left">
                                <p className="text-white/60 mb-4">Effective Date: January 1, 2026</p>
                                <p className="mb-4">VOOK values your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our platform.</p>
                                <p className="mb-4">By signing up or logging into VOOK, you agree to this Privacy Policy.</p>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">1. Information We Collect</h4>
                                    <p className="mb-2">We collect only what is necessary to run the platform:</p>
                                    <p className="text-white/70 font-medium mb-1">a) Information You Provide</p>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60 mb-2">
                                        <li>Name (if chosen to share)</li>
                                        <li>College / university name</li>
                                        <li>College email ID</li>
                                        <li>Profile details (optional)</li>
                                        <li>Content you post (public or anonymous)</li>
                                    </ul>
                                    <p className="text-white/70 font-medium mb-1">b) Automatically Collected Information</p>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>Device and app usage data</li>
                                        <li>Log data for security and performance</li>
                                        <li>Basic analytics to improve the app</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">2. Anonymous Usage</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>VOOK allows anonymous posting.</li>
                                        <li>Anonymous content is hidden from other users, not from VOOK.</li>
                                        <li>VOOK may internally link anonymous activity to your account for:
                                            <ul className="list-circle pl-5 mt-1">
                                                <li>Safety</li>
                                                <li>Abuse prevention</li>
                                                <li>Legal compliance</li>
                                            </ul>
                                        </li>
                                        <li>We do not reveal your identity to other users.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">3. How We Use Your Information</h4>
                                    <p className="mb-2">We use your information to:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60 mb-2">
                                        <li>Verify student identity</li>
                                        <li>Provide platform features</li>
                                        <li>Maintain safety and moderation</li>
                                        <li>Improve user experience</li>
                                        <li>Communicate important updates</li>
                                    </ul>
                                    <p className="text-white/60">We do not use your data for advertising profiling.</p>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">4. Data Sharing</h4>
                                    <p className="mb-2">VOOK does not sell or rent your personal data.</p>
                                    <p className="mb-1">We may share data only:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>When required by law</li>
                                        <li>To protect users or platform integrity</li>
                                        <li>With trusted service providers (e.g., hosting, authentication), only as needed</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">5. Data Storage & Security</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>We use reasonable security measures to protect your data.</li>
                                        <li>No system is 100% secure, but we actively work to safeguard information.</li>
                                        <li>Data is stored only as long as necessary for platform use.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">6. Your Choices & Rights</h4>
                                    <p className="mb-1">You can:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60 mb-2">
                                        <li>Edit your profile information</li>
                                        <li>Delete your account anytime</li>
                                        <li>Control what you share publicly or anonymously</li>
                                    </ul>
                                    <p className="text-white/60">Once deleted, your account data will be removed or anonymized where possible.</p>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">7. Children's Privacy</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>VOOK is not intended for users under 18.</li>
                                        <li>We do not knowingly collect data from minors.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">8. Platform Changes</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>VOOK may evolve over time.</li>
                                        <li>Features and data usage may change to improve the platform.</li>
                                        <li>We will update this policy if needed.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">9. Changes to This Policy</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-white/60">
                                        <li>We may update this Privacy Policy occasionally.</li>
                                        <li>Continued use of VOOK means you accept the updated policy.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-primary font-semibold mb-2">10. Contact Us</h4>
                                    <p className="text-white/60">If you have questions or concerns about privacy, contact us at:</p>
                                    <p className="text-white mt-1">📧 support@vook.com</p>
                                </section>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                    type: "spring",
                    damping: 20,
                    stiffness: 300
                }}
                className="relative w-full max-w-md"
            >
                <TiltCard intensity={5} className="w-full">
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">

                        {/* Decorative Gradient */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
                        <div className="absolute -top-[100px] -right-[100px] w-[200px] h-[200px] bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

                        {/* Icon Header */}
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 relative group">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                                <Shield className="w-8 h-8 text-primary relative z-10" />
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-2xl font-bold text-white tracking-tight">One Last Step</h2>
                            <p className="text-white/50 text-sm">Please review our community guidelines to continue.</p>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4 mb-8 border border-white/5">
                            <div className="flex items-start gap-3">
                                <FileText className="w-5 h-5 text-primary mt-0.5" />
                                <p className="text-sm text-white/80 leading-relaxed text-left">
                                    I HAVE CAREFULLY READ THE <span onClick={() => setShowTermsContent(true)} className="text-primary font-semibold cursor-pointer hover:underline">TERMS AND CONDITIONS</span> AND <span onClick={() => setShowPrivacyContent(true)} className="text-primary font-semibold cursor-pointer hover:underline">PRIVACY POLICY</span> .
                                </p>
                            </div>
                        </div>

                        {/* Checkbox Section */}
                        <div
                            className="flex items-center gap-3 mb-8 cursor-pointer group"
                            onClick={() => setIsChecked(!isChecked)}
                        >
                            <div className={`
                                w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300
                                ${isChecked ? 'bg-primary border-primary' : 'bg-transparent border-white/30 group-hover:border-primary/50'}
                            `}>
                                <AnimatePresence>
                                    {isChecked && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            <Check className="w-4 h-4 text-white font-bold" strokeWidth={4} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}>
                                I accept the terms and policies
                            </span>
                        </div>

                        {/* Action Button */}
                        <Button
                            onClick={handleAccept}
                            disabled={!isChecked || isLoading}
                            className={`
                                w-full h-12 rounded-xl font-bold text-lg transition-all duration-300 relative overflow-hidden
                                ${isChecked
                                    ? 'bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(29,155,240,0.3)] hover:shadow-[0_0_30px_rgba(29,155,240,0.5)] transform hover:-translate-y-0.5'
                                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                                }
                            `}
                        >
                            <div className="flex items-center justify-center gap-2">
                                {isLoading ? (
                                    <span className="animate-pulse">Processing...</span>
                                ) : (
                                    <>
                                        CONTINUE
                                        {isChecked && <ArrowRight className="w-5 h-5 animate-pulse" />}
                                    </>
                                )}
                            </div>
                        </Button>

                    </div>
                </TiltCard>
            </motion.div>
        </div>
    );
};

export default TermsModal;
