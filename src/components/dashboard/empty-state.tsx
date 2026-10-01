import { FileX } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
 title: string;
 description: string;
 action?: React.ReactNode;
 className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
 return (
 <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
 <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary border border-border">
 <FileX className="h-6 w-6 text-primary" />
 </div>
 <h3 className="mt-4 text-sm font-semibold">{title}</h3>
 <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
 {action && <div className="mt-4">{action}</div>}
 </div>
 );
}
