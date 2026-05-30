import { useEffect } from "react";

/**
 * Sets the document title for the current route.
 * Appends " — SDMS" suffix for consistency.
 */
export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} — SDMS | Ecole des Sciences Byimana`;
    return () => { document.title = prev; };
  }, [title]);
};
