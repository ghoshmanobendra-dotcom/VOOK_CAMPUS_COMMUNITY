import { Github, Globe } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Project {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    github_link: string | null;
    live_link: string | null;
    technologies: string[] | null;
}

interface ProjectCardProps {
    project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
    const openLink = (url: string | null) => {
        if (!url) return;
        let finalUrl = url;
        if (!url.startsWith('http')) {
            finalUrl = 'https://' + url;
        }
        window.open(finalUrl, '_blank');
    };

    return (
        <Card className="group overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 h-full flex flex-col">
            <div className="relative aspect-video overflow-hidden bg-muted/50">
                {project.image_url ? (
                    <img
                        src={project.image_url}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                        No Image
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-4 gap-2">
                    {project.github_link && (
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-lg hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); openLink(project.github_link); }}>
                            <Github className="h-4 w-4" />
                        </Button>
                    )}
                    {project.live_link && (
                        <Button size="icon" variant="default" className="h-8 w-8 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 transition-transform" onClick={(e) => { e.stopPropagation(); openLink(project.live_link); }}>
                            <Globe className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <CardHeader className="p-4 pb-2">
                <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {project.title}
                </h3>
            </CardHeader>

            <CardContent className="p-4 py-2 flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                    {project.description || "No description provided."}
                </p>
            </CardContent>

            <CardFooter className="p-4 pt-2 flex flex-wrap gap-1 mt-auto">
                {project.technologies && project.technologies.slice(0, 4).map((tech, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] px-2 py-0 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
                        {tech}
                    </Badge>
                ))}
                {project.technologies && project.technologies.length > 4 && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0">+{project.technologies.length - 4}</Badge>
                )}
            </CardFooter>
        </Card>
    );
};

export default ProjectCard;
