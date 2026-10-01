/**
 * Smoke test untuk `ui/switch.tsx`: memastikan API `@base-ui/react/switch`
 * yang dipakai (prop `checked` / `onCheckedChange`, atribut `data-checked`)
 benar-benar valid. Render ke HTML statis supaya tidak butuh browser.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Switch } from "../components/ui/switch";

function render(checked: boolean): string {
 return renderToStaticMarkup(
 React.createElement(Switch, {
 checked,
 readOnly: true,
 "aria-label": "Maintenance 7A",
 }),
 );
}

const off = render(false);
const on = render(true);

const checks: [string, boolean][] = [
 ["role switch ada", off.includes('role="switch"')],
 ["aria-label diteruskan", off.includes('aria-label="Maintenance 7A"')],
 // Cek ATRIBUT, bukan substring: nama kelas `data-checked:border-primary` juga
 // memuat teks "data-checked", jadi harus cari bentuk atributnya.
 ["unchecked: atribut data-unchecked", off.includes('data-unchecked=""')],
 ["checked: atribut data-checked", on.includes('data-checked=""')],
 ["unchecked tidak punya atribut data-checked", !off.includes('data-checked=""')],
 ["aria-checked ikut berubah", on.includes('aria-checked="true"') && off.includes('aria-checked="false"')],
 ["bisa difokus keyboard (tabindex)", on.includes('tabindex="0"')],
 ["input tersembunyi untuk form", on.includes('type="checkbox"')],
];

let failed = 0;
for (const [label, ok] of checks) {
 if (!ok) failed++;
 console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}
console.log(`\nHTML (checked):\n${on}\n`);
console.log(`HTML (unchecked):\n${off}\n`);
if (failed > 0) {
 console.error(`${failed} pemeriksaan gagal`);
 process.exit(1);
}
console.log("semua pemeriksaan lulus");
