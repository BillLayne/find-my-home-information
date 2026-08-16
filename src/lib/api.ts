import { buildPublicPropertyResponse, type PublicPropertyResponse } from "../../shared/property";

export async function findProperty(address: string) {
  const response = await fetch("/api/property", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  const payload = await response.json() as PublicPropertyResponse | { error?: string } | unknown;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && payload.error
      ? String(payload.error)
      : "Property lookup failed.";
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "generatedAt" in payload && "results" in payload) {
    return payload as PublicPropertyResponse;
  }

  // Vite's local proxy reaches the source API directly; production is already
  // normalized by the Cloudflare Function.
  return buildPublicPropertyResponse(payload, address);
}

export async function findCountyCoverage() {
  const response = await fetch("/api/counties", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as { count?: unknown } | null;
  if (!response.ok || typeof payload?.count !== "number" || !Number.isInteger(payload.count) || payload.count < 1) {
    throw new Error("County coverage is unavailable.");
  }
  return payload.count;
}
