// Microlib: bump versi data klien agar seluruh halaman yang sudah ter-mount
// ikut re-render ketika data dari API selesai disinkronkan (via useAuth).
type Listener = () => void;

const listeners = new Set<Listener>();
let version = 0;

export function subscribeData(listener: Listener): () => void {
 listeners.add(listener);
 return () => {
 listeners.delete(listener);
 };
}

export function bumpDataVersion(): void {
 version += 1;
 listeners.forEach((listener) => listener());
}

export function getDataVersion(): number {
 return version;
}

export function getServerDataVersion(): number {
 return 0;
}