import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Lock, Mail, User, Calendar, GraduationCap, Building2, BookOpen, ChevronLeft, Upload, Check, Github, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { VookLogo } from "@/components/VookLogo";
import Background3D from "@/components/Background3D";
import TiltCard from "@/components/TiltCard";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    // Check if user is already logged in or has error
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate("/");
            }
        };

        checkSession();

        // Check for auth errors in URL
        const handleAuthError = () => {
            const params = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.substring(1));

            const error = params.get("error") || hashParams.get("error");
            const errorDescription = params.get("error_description") || hashParams.get("error_description");

            if (error) {
                toast.error(decodeURIComponent(errorDescription || "Authentication failed"));
                // Clean URL
                window.history.replaceState(null, "", window.location.pathname);
            }
        };

        handleAuthError();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                navigate("/");
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    // Sign Up Steps: 1=Creds, 2=Personal, 3=Academic, 4=Avatar
    const [signupStep, setSignupStep] = useState(1);



    // Form State
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        username: "",
        fullName: "",
        gender: "",
        dob: "",
        college: "",
        department: "",
        passoutYear: "",
        avatar: null as File | null,
        avatarPreview: ""
    });

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData(prev => ({
                ...prev,
                avatar: file,
                avatarPreview: URL.createObjectURL(file)
            }));
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) throw error;

            // LocalStorage line removed
            toast.success("Welcome back!");
            navigate("/");
        } catch (error: any) {
            toast.error(error.message || "Failed to sign in");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = async () => {
        setIsLoading(true);
        try {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        username: formData.username,
                        full_name: formData.fullName,
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("No user created");

            // 2. Upload Profile Picture (Mock implementation if bucket not ready)
            let avatarUrl = "";
            if (formData.avatar) {
                // Ideally: await supabase.storage.from('avatars').upload(...)
                // For now, we'll note this is where it happens
                console.log("File to upload:", formData.avatar);
            }

            // 3. Insert into Profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    username: formData.username,
                    full_name: formData.fullName,
                    gender: formData.gender,
                    dob: formData.dob,
                    college: formData.college,
                    department: formData.department,
                    passout_year: formData.passoutYear,
                    avatar_url: avatarUrl
                });

            // Note: If 'profiles' table doesn't exist, this will error. 
            // We'll proceed to login anyway for the demo.
            if (profileError) console.error("Profile creation error:", profileError);

            // LocalStorage line removed
            toast.success("Account created successfully!");
            navigate("/");

        } catch (error: any) {
            toast.error(error.message || "Failed to sign up");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'github' | 'linkedin' | 'discord') => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${window.location.origin}/`,
                },
            });

            if (error) throw error;
        } catch (error: any) {
            console.error("Social login error:", error);
            toast.error(error.message || `Failed to sign in with ${provider}`);
        }
    };

    const nextStep = () => {
        setSignupStep(prev => prev + 1);
    };

    const prevStep = () => {
        setSignupStep(prev => prev - 1);
    };

    const renderSignUpStep = () => {
        switch (signupStep) {
            case 1: // Credentials
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-primary uppercase ml-1">Email</Label>
                            <div className="relative group/input">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange("email", e.target.value)}
                                    className="bg-white/5 border-white/10 text-white pl-10 h-11 focus:bg-white/10"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-primary uppercase ml-1">Username</Label>
                            <div className="relative group/input">
                                <UsuarioIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    value={formData.username}
                                    onChange={(e) => handleInputChange("username", e.target.value)}
                                    className="bg-white/5 border-white/10 text-white pl-10 h-11 focus:bg-white/10"
                                    placeholder="@username"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-primary uppercase ml-1">Password</Label>
                            <div className="relative group/input">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => handleInputChange("password", e.target.value)}
                                    className="bg-white/5 border-white/10 text-white pl-10 pr-10 h-11 focus:bg-white/10"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <Button onClick={nextStep} className="w-full h-11 bg-primary text-white rounded-xl mt-4">
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </motion.div>
                );
            case 2: // Personal
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-primary uppercase ml-1">Full Name</Label>
                            <div className="relative group/input">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    value={formData.fullName}
                                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                                    className="bg-white/5 border-white/10 text-white pl-10 h-11 focus:bg-white/10"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-primary uppercase ml-1">Gender</Label>
                                <Select onValueChange={(val) => handleInputChange("gender", val)}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-white">
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-primary uppercase ml-1">Date of Birth</Label>
                                <div className="relative group/input">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/input:text-primary transition-colors" />
                                    <Input
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => handleInputChange("dob", e.target.value)}
                                        className="bg-white/5 border-white/10 text-white pl-10 h-11 focus:bg-white/10"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <Button variant="outline" onClick={prevStep} className="flex-1 h-11 border-white/10 text-white hover:bg-white/5">Back</Button>
                            <Button onClick={nextStep} className="flex-1 h-11 bg-primary text-white">Next</Button>
                        </div>
                    </motion.div>
                );
            case 3: // Academic
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-primary uppercase ml-1">College</Label>
                            <div className="relative group/input">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    value={formData.college}
                                    onChange={(e) => handleInputChange("college", e.target.value)}
                                    className="bg-white/5 border-white/10 text-white pl-10 h-11 focus:bg-white/10"
                                    placeholder="Your University"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-primary uppercase ml-1">Department</Label>
                            <div className="relative group/input">
                                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    value={formData.department}
                                    onChange={(e) => handleInputChange("department", e.target.value)}
                                    className="bg-white/5 border-white/10 text-white pl-10 h-11 focus:bg-white/10"
                                    placeholder="e.g. Computer Science"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-primary uppercase ml-1">Passout Year</Label>
                            <div className="relative group/input">
                                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    value={formData.passoutYear}
                                    onChange={(e) => handleInputChange("passoutYear", e.target.value)}
                                    className="bg-white/5 border-white/10 text-white pl-10 h-11 focus:bg-white/10"
                                    placeholder="2026"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <Button variant="outline" onClick={prevStep} className="flex-1 h-11 border-white/10 text-white hover:bg-white/5">Back</Button>
                            <Button onClick={nextStep} className="flex-1 h-11 bg-primary text-white">Next</Button>
                        </div>
                    </motion.div>
                );
            case 4: // Profile Pic
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6 flex flex-col items-center"
                    >
                        <Label className="text-xs font-semibold text-primary uppercase">Profile Picture</Label>

                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-4 border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
                                {formData.avatarPreview ? (
                                    <img src={formData.avatarPreview} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="h-12 w-12 text-white/20" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/80 transition-colors shadow-lg">
                                <Upload className="h-4 w-4 text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>

                        <div className="w-full flex gap-3 mt-8">
                            <Button variant="outline" onClick={prevStep} className="flex-1 h-12 border-white/10 text-white hover:bg-white/5 rounded-xl">Back</Button>
                            <Button onClick={handleSignUp} disabled={isLoading} className="flex-1 h-12 bg-primary text-white rounded-xl font-bold hover:bg-primary/90">
                                {isLoading ? "Creating..." : "Finish"}
                            </Button>
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    const UsuarioIcon = ({ className }: { className?: string }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
            <path d="M12 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
    );

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden">
            <Background3D />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                <TiltCard intensity={10} className="w-full">
                    <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden group min-h-[600px] flex flex-col justify-center">

                        {/* Shimmer */}
                        <div className="absolute top-0 -left-1/2 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:animate-shimmer pointer-events-none" />

                        {/* Logo Header */}
                        <div className="flex flex-col items-center justify-center mb-6">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="mb-4 relative"
                            >
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                <VookLogo size="small" className="relative z-10" />
                            </motion.div>
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight text-center font-display">
                                {isLogin ? "Welcome Back" : "Join Campus"}
                            </h1>
                            <p className="text-white/50 text-center text-sm">
                                {isLogin
                                    ? "Sign in to access your dashboard."
                                    : `Step ${signupStep} of 4: ${signupStep === 1 ? 'Account Details' :
                                        signupStep === 2 ? 'Personal Info' :
                                            signupStep === 3 ? 'Academic Info' : 'Final Touch'
                                    }`
                                }
                            </p>
                        </div>

                        {/* Progress Bar for Signup */}
                        {!isLogin && (
                            <div className="flex gap-2 mb-6 px-4">
                                {[1, 2, 3, 4].map(step => (
                                    <div key={step} className={`h-1 flex-1 rounded-full transition-all duration-300 ${step <= signupStep ? 'bg-primary' : 'bg-white/10'}`} />
                                ))}
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-center">
                            <AnimatePresence mode="wait">
                                {isLogin ? (
                                    <motion.form
                                        key="login"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        onSubmit={handleLogin}
                                        className="space-y-5"
                                    >
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-primary uppercase ml-1">Email</Label>
                                            <div className="relative group/input">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/input:text-primary transition-colors" />
                                                <Input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => handleInputChange("email", e.target.value)}
                                                    className="bg-white/5 border-white/10 text-white pl-10 h-11 focus:bg-white/10"
                                                    placeholder="name@campus.edu"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-primary uppercase ml-1">Password</Label>
                                            <div className="relative group/input">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/input:text-primary transition-colors" />
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.password}
                                                    onChange={(e) => handleInputChange("password", e.target.value)}
                                                    className="bg-white/5 border-white/10 text-white pl-10 pr-10 h-11 focus:bg-white/10"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(29,155,240,0.3)] hover:shadow-[0_0_30px_rgba(29,155,240,0.5)] transition-all duration-300 mt-4"
                                        >
                                            {isLoading ? "Signing In..." : "Sign In"}
                                        </Button>

                                        <div className="relative my-6">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t border-white/10" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-black/40 px-2 text-white/40">Or continue with</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-3">
                                            <Button variant="outline" type="button" onClick={() => handleSocialLogin('google')} className="bg-white/5 border-white/10 hover:bg-white/10 text-white h-11 p-0">
                                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" style={{ fill: "#4285F4" }} />
                                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" style={{ fill: "#34A853" }} />
                                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" style={{ fill: "#FBBC05" }} />
                                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" style={{ fill: "#EA4335" }} />
                                                </svg>
                                            </Button>
                                            <Button variant="outline" type="button" onClick={() => handleSocialLogin('discord')} className="bg-white/5 border-white/10 hover:bg-white/10 text-white h-11 p-0">
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1892.3776-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1259.1023.2519.1973.3778.2915a.077.077 0 0 1-.0076.1277 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8333-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
                                                </svg>
                                            </Button>
                                            <Button variant="outline" type="button" onClick={() => handleSocialLogin('github')} className="bg-white/5 border-white/10 hover:bg-white/10 text-white h-11 p-0">
                                                <Github className="w-5 h-5 text-white" />
                                            </Button>
                                            <Button variant="outline" type="button" onClick={() => handleSocialLogin('linkedin')} className="bg-white/5 border-white/10 hover:bg-white/10 text-white h-11 p-0">
                                                <Linkedin className="w-5 h-5 text-[#0077b5]" />
                                            </Button>
                                        </div>
                                    </motion.form>
                                ) : (
                                    <div key="signup" className="h-full">
                                        {renderSignUpStep()}
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer Toggle */}
                        <div className="mt-6 text-center pt-6 border-t border-white/5">
                            <p className="text-white/40 text-sm">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                                <button
                                    onClick={() => {
                                        setIsLogin(!isLogin);
                                        setSignupStep(1);
                                    }}
                                    className="ml-2 text-primary hover:text-primary/80 font-semibold hover:underline transition-all"
                                >
                                    {isLogin ? "Join Now" : "Sign In"}
                                </button>
                            </p>
                        </div>

                    </div>
                </TiltCard>
            </motion.div>
        </div>
    );
};

export default Login;
