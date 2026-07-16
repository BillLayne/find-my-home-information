export type ExternalLinks = {
  googleMaps?: string;
  gis?: string;
  gisParcel?: string;
  taxCard?: string;
  deed?: string;
  zillow?: string;
  realtor?: string;
  fema: string;
  ncFlood: string;
  readyNc: string;
};

export type PublicProperty = {
  id: string;
  county: string;
  parcelId?: string;
  pin?: string;
  officialAddress: string;
  searchedAddress: string;
  recordAddressDiffers: boolean;
  totalAcres?: number;
  landValue?: number;
  buildingValue?: number;
  totalValue?: number;
  yearBuilt?: number;
  effectiveYearBuilt?: number;
  heatedArea?: number;
  groundFloorArea?: number;
  stories?: number;
  bedrooms?: number;
  fullBaths?: number;
  halfBaths?: number;
  exteriorWall?: string;
  roofStructure?: string;
  roofCover?: string;
  foundation?: string;
  heatingType?: string;
  salePrice?: number;
  saleDate?: string;
  deedBook?: string;
  deedPage?: string;
  latitude?: number;
  longitude?: number;
  parcelRings?: Array<Array<[number, number]>>;
  matchMethod: "parcel-point" | "address" | "geocode-only";
  hasCountyRecord: boolean;
  links: ExternalLinks;
};

export type PublicPropertyResponse = {
  inputAddress: string;
  formattedAddress: string;
  county?: string;
  note?: string;
  results: PublicProperty[];
  generatedAt: string;
};

type UpstreamResult = Record<string, unknown>;

type UpstreamResponse = {
  formattedAddress?: unknown;
  county?: unknown;
  note?: unknown;
  results?: unknown;
};

function text(value: unknown) {
  if (value == null) return undefined;
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function number(value: unknown) {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function integer(value: unknown) {
  const parsed = number(value);
  return parsed == null ? undefined : Math.trunc(parsed);
}

function coordinate(value: unknown, minimum: number, maximum: number) {
  const parsed = number(value);
  return parsed != null && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

function parcelRings(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const rings = value
    .slice(0, 20)
    .map((ring) => Array.isArray(ring)
      ? ring
        .slice(0, 10000)
        .filter((point) => Array.isArray(point) && point.length >= 2)
        .map((point) => [
          coordinate(point[0], -180, 180),
          coordinate(point[1], -90, 90),
        ] as const)
        .filter((point): point is [number, number] => point[0] != null && point[1] != null)
      : [])
    .filter((ring) => ring.length >= 3);
  return rings.length ? rings : undefined;
}

function matchMethod(value: unknown, hasCountyRecord: boolean): PublicProperty["matchMethod"] {
  return value === "parcel-point" || value === "address" || value === "geocode-only"
    ? value
    : hasCountyRecord
      ? "address"
      : "geocode-only";
}

function safeUrl(value: unknown) {
  const normalized = text(value);
  if (!normalized) return undefined;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeStreetAddress(value: string) {
  return value
    .split(",")[0]
    .toUpperCase()
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bHIGHWAY\b/g, "HWY")
    .replace(/\bCOURT\b/g, "CT")
    .replace(/\bCIRCLE\b/g, "CIR")
    .replace(/\bTRAIL\b/g, "TRL")
    .replace(/\bPARKWAY\b/g, "PKWY")
    .replace(/[^A-Z0-9]/g, "");
}

export function buildFemaLink(address: string) {
  return `https://msc.fema.gov/portal/search?AddressQuery=${encodeURIComponent(address)}`;
}

export function buildPublicPropertyResponse(raw: unknown, inputAddress: string, now = new Date()) : PublicPropertyResponse {
  const payload = (raw && typeof raw === "object" ? raw : {}) as UpstreamResponse;
  const formattedAddress = text(payload.formattedAddress) || inputAddress;
  const rawResults = Array.isArray(payload.results) ? payload.results.filter((item): item is UpstreamResult => Boolean(item && typeof item === "object")) : [];

  const results = rawResults.map((item, index) => {
    const county = text(item.county) || text(payload.county) || "North Carolina";
    const officialAddress = text(item.siteAddress) || formattedAddress;
    const parcelId = text(item.parcelId);
    const pin = text(item.pin);
    const hasCountyRecord = Boolean(parcelId || pin);

    return {
      id: `${county}-${parcelId || pin || index}`,
      county,
      parcelId,
      pin,
      officialAddress,
      searchedAddress: formattedAddress,
      recordAddressDiffers: normalizeStreetAddress(officialAddress) !== normalizeStreetAddress(formattedAddress),
      totalAcres: number(item.totalAcres),
      landValue: number(item.landValue),
      buildingValue: number(item.buildingValue),
      totalValue: number(item.totalValue),
      yearBuilt: integer(item.yearBuilt),
      effectiveYearBuilt: integer(item.effectiveYearBuilt),
      heatedArea: number(item.heatedArea),
      groundFloorArea: number(item.groundFloorArea),
      stories: number(item.stories),
      bedrooms: integer(item.bedrooms),
      fullBaths: integer(item.fullBaths),
      halfBaths: integer(item.halfBaths),
      exteriorWall: text(item.exteriorWall),
      roofStructure: text(item.roofStructure),
      roofCover: text(item.roofCover),
      foundation: text(item.foundation),
      heatingType: text(item.heatingType),
      salePrice: number(item.salePrice),
      saleDate: text(item.saleDate),
      deedBook: text(item.deedBook),
      deedPage: text(item.deedPage),
      latitude: coordinate(item.latitude, -90, 90),
      longitude: coordinate(item.longitude, -180, 180),
      parcelRings: parcelRings(item.parcelRings),
      matchMethod: matchMethod(item.matchMethod, hasCountyRecord),
      hasCountyRecord,
      links: {
        googleMaps: safeUrl(item.googleMapsLink),
        gis: safeUrl(item.gisLink),
        gisParcel: safeUrl(item.gisParcelLink),
        taxCard: safeUrl(item.taxCardLink),
        deed: safeUrl(item.deedLink),
        zillow: safeUrl(item.zillowLink),
        realtor: safeUrl(item.realtorLink),
        fema: buildFemaLink(formattedAddress),
        ncFlood: "https://fris.nc.gov/fris/",
        readyNc: "https://www.readync.gov/",
      },
    } satisfies PublicProperty;
  });

  return {
    inputAddress,
    formattedAddress,
    county: text(payload.county),
    note: text(payload.note),
    results,
    generatedAt: now.toISOString(),
  };
}
