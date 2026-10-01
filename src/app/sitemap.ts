import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
 const now = new Date();
 return [
 {
 url: `${SITE_URL}/`,
 lastModified: now,
 changeFrequency: "monthly",
 priority: 0.8,
 },
 {
 url: `${SITE_URL}/login`,
 lastModified: now,
 changeFrequency: "monthly",
 priority: 0.7,
 },
 {
 url: `${SITE_URL}/login/admin`,
 lastModified: now,
 changeFrequency: "monthly",
 priority: 0.4,
 },
 {
 url: `${SITE_URL}/login/student`,
 lastModified: now,
 changeFrequency: "monthly",
 priority: 0.4,
 },
 ];
}