import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const VookLogo = ({ size = "large", className }: { size?: "small" | "large", className?: string }) => {
  const isLarge = size === "large";

  return (
    <div className={cn("relative flex items-center justify-center perspective-1000", isLarge ? "p-4" : "p-1", className)}>
      <motion.div
        className="relative z-10"
        initial={{ rotateX: 0, rotateY: 0 }}
        animate={{
          rotateX: [0, 5, 0, -5, 0],
          rotateY: [0, 10, 0, -10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          width: isLarge ? "180px" : "48px",
          height: isLarge ? "180px" : "48px",
          transformStyle: "preserve-3d",
        }}
      >
        <div className="relative w-full h-full rounded-full bg-foreground flex items-center justify-center shadow-2xl overflow-hidden group border border-border">
          <span className="font-['Inter'] font-black text-background leading-none" style={{ fontSize: isLarge ? "8rem" : "2rem" }}>
            V
          </span>
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* 3D Depth Layers for Logo - Monochrome Shadow */}
        <div className="absolute inset-0 -z-10 bg-white/5 rounded-full blur-xl transform translate-z-[-20px]" />
      </motion.div>
    </div>
  );
};
