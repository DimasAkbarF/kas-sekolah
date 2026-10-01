import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva(
 "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
 {
 variants: {
 variant: {
 default: "border-primary/20 bg-primary text-primary-foreground [a]:hover:bg-primary/90",
 secondary: "border-teal-line bg-teal-soft [a]:hover:bg-teal-soft-hover",
 destructive: "border-danger-line bg-danger-soft [a]:hover:bg-danger-soft-hover",
 gold: "border-warning-line bg-warning-soft font-semibold [a]:hover:bg-warning-soft-hover",
 teal: "border-teal-line bg-teal-soft font-medium [a]:hover:bg-teal-soft-hover",
 coral: "border-danger-line bg-danger-soft font-medium [a]:hover:bg-danger-soft-hover",
 sky: "border-info-line bg-info-soft font-medium [a]:hover:bg-info-soft-hover",
 cream: "border-cream-line bg-cream text-cream-ink [a]:hover:bg-cream-soft-hover",
 success: "border-success-line bg-success-soft font-medium [a]:hover:bg-success-soft-hover",
 outline: "border-border text-foreground [a]:hover:bg-muted/70",
 ghost: "border-transparent hover:bg-muted/70 hover:text-muted-foreground",
 link: "border-transparent text-primary underline-offset-4 hover:underline",
 },
 },
 defaultVariants: {
 variant: "default",
 },
 },
);

function Badge({
 className,
 variant = "default",
 render,
 ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
 return useRender({
 defaultTagName: "span",
 props: mergeProps<"span">(
 {
 className: cn(badgeVariants({ variant }), className),
 },
 props,
 ),
 render,
 state: {
 slot: "badge",
 variant,
 },
 });
}

export { Badge, badgeVariants };
