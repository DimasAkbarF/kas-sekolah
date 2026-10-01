import { cn } from "@/lib/utils";
import { PageHeader, type PageAccent } from "@/components/layout/page-header";

interface DashboardHeaderProps {
 title: string;
 subtitle?: string;
 badge?: string;
 icon?: React.ReactNode;
 accent?: PageAccent;
 action?: React.ReactNode;
 className?: string;
}

export function DashboardHeader({
 title,
 subtitle,
 badge,
 icon,
 accent = "teal",
 action,
 className,
}: DashboardHeaderProps) {
 return (
 <PageHeader
 title={title}
 subtitle={subtitle}
 icon={icon}
 badge={badge}
 accent={accent}
 action={action}
 className={cn("!pb-4", className)}
 />
 );
}
