import type { PublicProperty } from "../../shared/property";

export type DestinationKind = "record" | "search" | "website";

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

// A matched parcel does not guarantee that the county supplied a deep link.
// Only label a record link when its URL carries this property's identifier.
export function destinationKind(href: string | undefined, property?: PublicProperty): DestinationKind {
  if (!href) return "website";
  try {
    const url = new URL(href);
    if (!/^https?:$/.test(url.protocol)) return "website";
    const candidates = [
      ...url.searchParams.values(),
      ...decodeURIComponent(url.pathname).split("/"),
      ...decodeURIComponent(url.hash).split(/[=&/?#]/),
    ].flatMap((value) => value.split(/["']/)).map((value) => compact(value.replace(/\.(pdf|html?|aspx)$/i, "")));
    const ids = [property?.parcelId, property?.pin].filter((id): id is string => Boolean(id));
    if (ids.some((id) => compact(id).length >= 5 && candidates.includes(compact(id)))) return "record";
    const addressKeys = ["addressquery", "address", "query", "q", "searchtext"];
    if ([...url.searchParams].some(([key, value]) => addressKeys.includes(key.toLowerCase()) && /\d/.test(value) && /[a-z]/i.test(value))) return "search";
    if ((url.hostname === "zillow.com" || url.hostname.endsWith(".zillow.com")) && /\/homes\/.+_rb\/?$/.test(url.pathname)) return "search";
    return "website";
  } catch {
    return "website";
  }
}

export function destinationLabel(kind: DestinationKind) {
  return kind === "record" ? "Property-specific link" : kind === "search" ? "Address search" : "General website";
}

export function validateAddress(address: string) {
  const clean = address.replace(/\s+/g, " ").trim();
  return clean.length < 5 || clean.length > 180
    ? "Enter the full street address, city, and NC ZIP code (5 to 180 characters)."
    : "";
}

export function propertyShareUrl(base: string, property: PublicProperty) {
  const url = new URL(base);
  url.search = "";
  url.hash = "";
  url.searchParams.set("address", property.searchedAddress);
  if (property.parcelId || property.pin) url.searchParams.set("parcel", property.parcelId || property.pin || "");
  return url.toString();
}
