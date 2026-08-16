export const DEFAULT_PROPERTY_LOOKUP_URL = "https://nc-insurance-tools-gemini.pages.dev/api/lookup";

export function buildCountyCoverageUrl(lookupUrl: string) {
  const url = new URL(lookupUrl);
  url.pathname = "/api/counties";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function countIntegratedCounties(payload: unknown) {
  if (!Array.isArray(payload)) return null;
  const ids = new Set(
    payload
      .map((entry) => entry && typeof entry === "object" && "id" in entry ? String(entry.id).trim() : "")
      .filter(Boolean),
  );
  return ids.size > 0 ? ids.size : null;
}
