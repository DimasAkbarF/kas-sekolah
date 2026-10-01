"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
 DEFAULT_LOCALE,
 getLocale,
 setLocale,
 subscribeLocale,
 translate,
 type AppLocale,
 type TKey,
 type TParams,
} from "@/lib/i18n";

export function useI18n() {
 const locale = useSyncExternalStore(subscribeLocale, getLocale, () => DEFAULT_LOCALE);

 const changeLocale = useCallback((next: AppLocale) => setLocale(next), []);

 const t = useCallback(
 (key: TKey, params?: TParams) => translate(locale, key, params),
 [locale],
 );

 return {
 locale,
 setLocale: changeLocale,
 t,
 };
}