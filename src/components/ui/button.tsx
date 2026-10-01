import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva(
 "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
 {
 variants: {
 variant: {
 default:
 "bg-primary text-primary-foreground shadow-teal-sm hover:bg-primary/90 active:scale-[0.98]",
 outline:
 "border-border bg-background shadow-xs hover:bg-secondary/60 hover:text-primary hover:border-teal-line active:scale-[0.98]",
 secondary:
 "bg-secondary text-secondary-foreground shadow-xs hover:bg-teal-soft-hover active:scale-[0.98]",
 ghost: "hover:bg-secondary/60 hover:text-primary active:scale-[0.98]",
      destructive:
        "bg-destructive text-destructive-foreground shadow-coral-sm hover:bg-destructive/90 active:scale-[0.98]",
      success:
        "bg-success text-success-foreground shadow-xs hover:bg-success/90 active:scale-[0.98]",
 gold:
 "bg-gold text-gold-ink font-semibold border border-gold-line shadow-gold-sm hover:bg-gold-dark active:scale-[0.98]",
 teal:
 "bg-primary text-primary-foreground shadow-teal-sm hover:bg-primary/90 active:scale-[0.98]",
 coral:
 "bg-destructive text-destructive-foreground shadow-coral-sm hover:bg-destructive/90 active:scale-[0.98]",
 cream:
 "bg-cream text-cream-ink border border-cream-line hover:bg-cream-soft-hover active:scale-[0.98]",
 link: "text-primary underline-offset-4 hover:underline",
 },
 size: {
 default: "h-9 gap-2 px-3.5",
 sm: "h-8 gap-1.5 rounded-md px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
 xs: "h-7 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
 lg: "h-10 gap-2 px-5 text-sm",
 pill: "h-9 gap-2 px-4 rounded-full",
 "pill-sm": "h-8 gap-1.5 px-3.5 rounded-full text-xs [&_svg:not([class*='size-'])]:size-3.5",
 icon: "size-9",
 "icon-sm": "size-8 rounded-md",
 "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
 "icon-lg": "size-10",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "default",
 },
 },
);

function Button({
 className,
 variant = "default",
 size = "default",
 ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
 return (
 <ButtonPrimitive
 data-slot="button"
 className={cn(buttonVariants({ variant, size, className }))}
 {...props}
 />
 );
}

export { Button, buttonVariants };
