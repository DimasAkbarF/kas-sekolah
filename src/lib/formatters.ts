export function formatCurrency(amount: number): string {
 return new Intl.NumberFormat("id-ID", {
 style: "currency",
 currency: "IDR",
 minimumFractionDigits: 0,
 maximumFractionDigits: 0,
 }).format(amount);
}

export function formatDate(dateString: string): string {
 return new Date(dateString).toLocaleDateString("id-ID", {
 day: "numeric",
 month: "long",
 year: "numeric",
 });
}

export function formatDateTime(dateString: string): string {
 return new Date(dateString).toLocaleDateString("id-ID", {
 day: "numeric",
 month: "long",
 year: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 });
}

export function formatCompactCurrency(amount: number): string {
 if (amount >= 1000000000) {
 return `Rp${(amount / 1000000000).toFixed(1)}M`;
 }
 if (amount >= 1000000) {
 return `Rp${(amount / 1000000).toFixed(1)}jt`;
 }
 if (amount >= 1000) {
 return `Rp${(amount / 1000).toFixed(0)}rb`;
 }
 return formatCurrency(amount);
}
