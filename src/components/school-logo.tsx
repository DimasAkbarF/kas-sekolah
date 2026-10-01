"use client";

import { useSchool } from "@/hooks/use-school";
import { cn } from "@/lib/utils";
import { School } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

interface SchoolLogoProps {
 /** Wrapper classes: fixed size, rounding, and fallback background (e.g."h-8 w-8 rounded-md bg-primary text-primary-foreground"). */
 className?: string;
 /** Size class for the fallback icon (e.g."h-4 w-4"). */
 iconClassName?: string;
 /** Size class for the uploaded image (e.g."h-4 w-4"). */
 imageClassName?: string;
 /** Pending draft override: null forces the fallback icon, a string wins over the store. */
 logoUrl?: string | null;
}

// Single source of truth for rendering the school logo across the app.
// Uploaded image keeps its aspect ratio (object-contain/center) and never
// inherits a UI background, so transparent PNGs stay transparent.
export function SchoolLogo({
 className,
 iconClassName = "h-6 w-6",
 imageClassName,
 logoUrl: draftUrl,
}: SchoolLogoProps) {
 const profile = useSchool();
 const { t } = useI18n();

 const logoUrl = draftUrl !== undefined ? draftUrl : profile.logoUrl;

 if (logoUrl) {
 return (
 <span
 className={cn(
 "flex shrink-0 items-center justify-center overflow-hidden",
 className,
 "bg-transparent",
 )}
 >
 {/* User-uploaded asset; next/image is not used for arbitrary data URLs. */}
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={logoUrl}
 alt={t("app.schoolLogo")}
 className={cn("object-contain object-center", imageClassName ?? "h-full w-full")}
 />
 </span>
 );
 }

 return (
 <span className={cn("flex shrink-0 items-center justify-center overflow-hidden", className)}>
 <School className={iconClassName} aria-hidden="true" />
 </span>
 );
}
