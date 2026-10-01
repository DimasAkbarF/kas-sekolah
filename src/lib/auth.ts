import type { User } from "@/types";

const SESSION_KEY = "kas-sekolah.session";

type Listener = () => void;

// Minimal external store so the UI reacts to session changes without
// binding components directly to localStorage. Swappable in backend phase.
const listeners = new Set<Listener>();

// Snapshot cache so useSyncExternalStore sees a stable reference.
// Returns the same mutated object only after the raw value actually changes;
// otherwise React would treat every render as a store change (infinite loop).
let cachedRaw: string | null | undefined;
let cachedValue: User | null | undefined;

export function subscribeAuth(listener: Listener): () => void {
 listeners.add(listener);
 return () => {
 listeners.delete(listener);
 };
}

function notify(): void {
 listeners.forEach((listener) => listener());
}

export function getStoredSession(): User | null {
 if (typeof window === "undefined") return null;

 const raw = window.localStorage.getItem(SESSION_KEY);
 if (raw === cachedRaw) {
 return cachedValue ?? null;
 }
 cachedRaw = raw;

 let parsed: User | null = null;
 try {
 if (raw) {
 const candidate = JSON.parse(raw) as User;
 if (candidate && candidate.id && candidate.role) {
 parsed = candidate;
 }
 }
 } catch {
 cachedValue = null;
 return null;
 }
 cachedValue = parsed;
 return parsed;
}

export function setStoredSession(user: User): void {
 if (typeof window === "undefined") return;
 window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
 cachedRaw = undefined;
 cachedValue = undefined;
 notify();
}

export function clearStoredSession(): void {
 if (typeof window === "undefined") return;
 window.localStorage.removeItem(SESSION_KEY);
 cachedRaw = undefined;
 cachedValue = undefined;
 notify();
}