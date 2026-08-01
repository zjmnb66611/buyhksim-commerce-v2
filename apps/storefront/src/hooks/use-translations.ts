"use client";

import { useCallback } from "react";
import { formatLocale, translate, type TranslationValues } from "@buyhksim/i18n";
import { useCommerceStore } from "../store/commerce-store";

export function useTranslations() {
  const locale = useCommerceStore((state) => state.locale);
  const t = useCallback((source: string, values?: TranslationValues) => translate(locale, source, values), [locale]);
  return { locale, intlLocale: formatLocale(locale), t };
}
