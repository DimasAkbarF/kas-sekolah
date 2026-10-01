"use client";

import { useSyncExternalStore } from "react";
import {
 Breadcrumb,
 BreadcrumbItem,
 BreadcrumbLink,
 BreadcrumbList,
 BreadcrumbPage,
 BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "./notification-bell";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
 breadcrumbs: { label: string; href?: string }[];
}

const dateSubscribers = new Set<() => void>();
const cachedToday = new Intl.DateTimeFormat("id-ID", {
 weekday: "long",
 day: "numeric",
 month: "long",
 year: "numeric",
}).format(new Date());

function subscribeToday(cb: () => void) {
 dateSubscribers.add(cb);
 return () => {
 dateSubscribers.delete(cb);
 };
}

export function Header({ breadcrumbs }: HeaderProps) {
 const today = useSyncExternalStore(
 subscribeToday,
 () => cachedToday,
 () => cachedToday,
 );

 return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background dark:bg-card px-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <SidebarTrigger className="-ml-1 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/40" />
        <Separator orientation="vertical" className="h-4 bg-border" />
        <Breadcrumb className="truncate">
          <BreadcrumbList className="text-xs">
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={crumb.label}>
                {index > 0 && <BreadcrumbSeparator className="text-muted-foreground/60" />}
                {crumb.href ? (
                  <BreadcrumbLink
                    href={crumb.href}
                    className="text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="font-semibold text-foreground">{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        {today && (
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground/80 bg-secondary/60 border border-border px-2.5 py-1 rounded-full tabular-nums">
            {today}
          </span>
        )}
      </div>

 <div className="flex items-center gap-1.5 shrink-0">
 <LanguageToggle />
 <ThemeToggle />
 <NotificationBell />
 </div>
 </header>
 );
}
