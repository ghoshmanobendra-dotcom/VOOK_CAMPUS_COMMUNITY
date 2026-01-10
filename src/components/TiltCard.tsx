
import React, { useRef, useState } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface TiltCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    intensity?: number;
}

const TiltCard = ({ children, className, intensity = 15, ...props }: TiltCardProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        setRotateX(yPct * -intensity);
        setRotateY(xPct * intensity);
    };

    const handleMouseLeave = () => {
        setRotateX(0);
        setRotateY(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transformStyle: "preserve-3d",
            }}
            animate={{
                rotateX,
                rotateY,
            }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
            }}
            className={cn("relative transition-all duration-200 ease-out", className)}
            {...props}
        >
            <div style={{ transform: "translateZ(50px)" }}>
                {children}
            </div>
            {/* Glossy overlay effect */}
            <div
                className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                style={{ transform: "translateZ(60px)" }}
            />
        </motion.div>
    );
};

export default TiltCard;
