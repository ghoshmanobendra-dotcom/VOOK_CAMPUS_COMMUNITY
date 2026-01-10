import { useEffect, useRef } from "react";

const Background3D = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        // Theme Colors
        const colors = ["#1D9BF0", "#ffffff", "#8ECDF8"]; // Primary Blue, White, Secondary Blue
        // Reduced particle count slightly for cleaner look
        const particleCount = Math.min(Math.floor((width * height) / 12000), 120);
        const connectionDistance = 150;
        const mouseParams = { x: -1000, y: -1000, radius: 150 }; // Init off-screen

        class Particle {
            x: number;
            y: number;
            originX: number;
            originY: number;
            vx: number;
            vy: number;
            size: number;
            color: string;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.originX = this.x;
                this.originY = this.y;
                this.vx = 0;
                this.vy = 0;
                this.size = Math.random() * 2 + 1;
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update(mouseX: number, mouseY: number) {
                // Physics Constants
                const friction = 0.9; // Damping
                const springFactor = 0.05; // Return to origin strength

                // 1. Spring force to return to origin
                const dxOrigin = this.originX - this.x;
                const dyOrigin = this.originY - this.y;
                this.vx += dxOrigin * springFactor;
                this.vy += dyOrigin * springFactor;

                // 2. Mouse Repulsion
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouseParams.radius) {
                    const angle = Math.atan2(dy, dx);
                    const force = (mouseParams.radius - distance) / mouseParams.radius;
                    const pushStrength = 2.0;

                    // Push away from mouse
                    this.vx -= Math.cos(angle) * force * pushStrength;
                    this.vy -= Math.sin(angle) * force * pushStrength;
                }

                // 3. Apply Friction
                this.vx *= friction;
                this.vy *= friction;

                // 4. Update Position
                this.x += this.vx;
                this.y += this.vy;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        const particles: Particle[] = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Update and Draw Particles
            particles.forEach((particle) => {
                particle.update(mouseParams.x, mouseParams.y);
                particle.draw();
            });

            // Draw Connections
            ctx.lineWidth = 0.5;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        const opacity = 1 - distance / connectionDistance;
                        // Tint connections based on particle movement/energy? 
                        // Staying consistent with blue/white scheme
                        ctx.strokeStyle = `rgba(29, 155, 240, ${opacity * 0.3})`;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            // Simplified: just re-init particles on resize to prevent them grouping
            particles.length = 0;
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseParams.x = e.clientX;
            mouseParams.y = e.clientY;
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none">
            {/* Deep radial gradient to give depth behind the particles */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black opacity-80" />
            <canvas ref={canvasRef} className="absolute inset-0" />
        </div>
    );
};

export default Background3D;
