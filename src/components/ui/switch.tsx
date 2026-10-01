import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

/**
 * Sakelar biner. Memakai `@base-ui/react/switch` yang sudah terpasang, jadi
 * tidak ada dependency baru.
 *
 * Bentuknya sengaja bukan pil penuh: track 1px, knob 14px. Sakelar status
 * institusional tampil seperti kontrol, bukan seperti dekorasi.
 */
function Switch({
 className,
 ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
 return (
 <SwitchPrimitive.Root
 className={cn(
 "group relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border bg-muted transition-colors",
 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
 "data-checked:border-primary data-checked:bg-primary",
 "disabled:cursor-not-allowed disabled:opacity-50",
 className,
 )}
 {...props}
 >
 <SwitchPrimitive.Thumb
 className={cn(
 "pointer-events-none block h-3.5 w-3.5 rounded-full bg-card shadow-xs ring-0",
 "translate-x-0.5 transition-transform duration-150 ease-out",
 "data-checked:translate-x-[1.125rem]",
 )}
 />
 </SwitchPrimitive.Root>
 );
}

export { Switch };
