import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Background3D from "./Background3D";
import { supabase } from "@/integrations/supabase/client";
import TermsModal from "./TermsModal";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [showTerms, setShowTerms] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;

        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (mounted) {
                    setIsAuthenticated(!!session);
                    if (session) {
                        setUserId(session.user.id);
                        // Check terms status
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('terms_accepted')
                            .eq('id', session.user.id)
                            .single();

                        if (profile && profile.terms_accepted === false) {
                            setShowTerms(true);
                        }
                    }
                }
            } catch (error) {
                console.error("Auth check error:", error);
                if (mounted) setIsAuthenticated(false);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (mounted) {
                setIsAuthenticated(!!session);
                if (session) {
                    setUserId(session.user.id);
                    // Re-check terms on auth change (e.g. login)
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('terms_accepted')
                        .eq('id', session.user.id)
                        .single();

                    if (profile && profile.terms_accepted === false) {
                        setShowTerms(true);
                    }
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [location.pathname]);

    if (isAuthenticated === null) {
        return <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (showTerms && userId) {
        return (
            <>
                <div className="fixed inset-0 z-[-1]">
                    <Background3D />
                </div>
                <TermsModal
                    isOpen={showTerms}
                    userId={userId}
                    onComplete={() => {
                        setShowTerms(false);
                        navigate("/"); // Redirect to home page as requested
                    }}
                />
            </>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-[-1]">
                <Background3D />
            </div>
            {children}
        </>
    );
};

export default ProtectedRoute;
