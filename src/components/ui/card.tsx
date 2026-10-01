import * as React from "react";
import { cn } from "@/lib/utils";
export type CardVariant =
 | "default"
 | "primary"
 | "secondary"
 | "cream"
 | "gold"
 | "coral"
 | "success"
 | "warning"
 | "destructive"
 | "sky"
 | "info";

/** Strip status 2px di sisi awal. 2px, bukan 4px: 4px di sebelah garis 1px
 *  terbaca sebagai dekorasi, bukan penanda. */
export type CardAccentBar = "teal" | "gold" | "coral" | "sky" | "success";

/* Dark: kartu selalu permukaan netral (bg-card + border tipis). Varian warna
   hanya mengubah warna teks, bukan latar kartu, supaya hierarki utama kartu
   tetap datang dari surface, bukan dari warna. */
const cardVariantClasses: Record<CardVariant, string> = {
  default:
    "border-border bg-card text-card-foreground shadow-card hover:border-teal-line transition-colors",
  primary:
    "border-teal-dark bg-teal text-white shadow-teal-sm dark:border-teal-line dark:bg-card dark:text-foreground",
  secondary:
    "border-teal-line bg-teal-soft text-foreground shadow-xs dark:border-border dark:bg-card",
  cream:
    "border-cream-line bg-cream text-cream-ink shadow-xs dark:border-border dark:bg-card dark:text-foreground",
  gold: "border-gold-line bg-warning-soft text-warning-ink shadow-gold-sm dark:border-border dark:bg-card dark:text-foreground",
  coral: "border-danger-line bg-danger-soft text-danger-strong-ink shadow-coral-sm dark:border-border dark:bg-card dark:text-foreground",
  warning: "border-danger-line bg-danger-soft text-danger-strong-ink shadow-coral-sm dark:border-border dark:bg-card dark:text-foreground",
  destructive: "border-danger-line bg-danger-soft text-danger-strong-ink shadow-coral-sm dark:border-border dark:bg-card dark:text-foreground",
  success: "border-success-line bg-success-soft text-success-ink shadow-xs dark:border-border dark:bg-card dark:text-foreground",
  sky: "border-info-line bg-info-soft text-info-ink shadow-xs dark:border-border dark:bg-card dark:text-foreground",
  info: "border-info-line bg-info-soft text-info-ink shadow-xs dark:border-border dark:bg-card dark:text-foreground",
};

const accentBarClasses: Record<CardAccentBar, string> = {
 teal: "border-s-2 border-s-teal",
 gold: "border-s-2 border-s-gold",
 coral: "border-s-2 border-s-destructive",
 sky: "border-s-2 border-s-sky",
 success: "border-s-2 border-s-success",
};

function Card({
 className,
 size = "default",
 variant = "default",
 accentBar,
 ...props
}: React.ComponentProps<"div"> & {
 size?: "default" | "sm";
 variant?: CardVariant;
 accentBar?: CardAccentBar;
}) {
 return (
 <div
 data-slot="card"
 data-size={size}
 data-variant={variant}
 className={cn(
 "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl border py-(--card-spacing) text-sm transition-colors [--card-spacing:--spacing(5)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3.5)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
 cardVariantClasses[variant],
 accentBar && accentBarClasses[accentBar],
 className,
 )}
 {...props}
 />
 );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="card-header"
 className={cn(
 "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
 className,
 )}
 {...props}
 />
 );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="card-title"
 className={cn(
 "text-base font-semibold leading-none tracking-tight text-foreground group-data-[size=sm]/card:text-sm group-data-[variant=primary]/card:text-white dark:group-data-[variant=primary]/card:text-foreground",
 className,
 )}
 {...props}
 />
 );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="card-description"
 className={cn(
 "text-xs text-muted-foreground group-data-[variant=primary]/card:text-primary-foreground/90 dark:group-data-[variant=primary]/card:text-muted-foreground",
 className,
 )}
 {...props}
 />
 );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="card-action"
 className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
 {...props}
 />
 );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div data-slot="card-content" className={cn("px-(--card-spacing)", className)} {...props} />
 );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="card-footer"
 className={cn(
 "flex items-center rounded-b-xl border-t border-border/60 bg-muted/30 p-(--card-spacing) group-data-[variant=primary]/card:border-primary/30 group-data-[variant=primary]/card:bg-primary/20 group-data-[variant=primary]/card:text-primary-foreground dark:group-data-[variant=primary]/card:border-border dark:group-data-[variant=primary]/card:bg-muted/40 dark:group-data-[variant=primary]/card:text-muted-foreground",
 className,
 )}
 {...props}
 />
 );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
