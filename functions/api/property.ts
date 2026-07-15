import { buildPublicPropertyResponse } from "../../shared/property";

type Env = {
  PROPERTY_LOOKUP_URL?: string;
};

const DEFAULT_LOOKUP_URL = "https://nc-insurance-tools-gemini.pages.dev/api/lookup";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { address?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Enter a valid North Carolina address." }, 400);
  }

  const address = typeof body.address === "string" ? body.address.replace(/\s+/g, " ").trim() : "";
  if (address.length < 5 || address.length > 180) {
    return json({ error: "Enter a complete street address between 5 and 180 characters." }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(env.PROPERTY_LOOKUP_URL || DEFAULT_LOOKUP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BillLayneInsurance-FindMyHome/1.0",
      },
      body: JSON.stringify({ address }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = payload && typeof payload === "object" && "error" in payload ? String(payload.error) : "Property information is unavailable right now.";
      return json({ error }, response.status >= 400 && response.status < 500 ? response.status : 502);
    }

    return json(buildPublicPropertyResponse(payload, address));
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "The county lookup took too long. Please try again."
      : "We could not reach the property information service. Please try again.";
    return json({ error: message }, 502);
  } finally {
    clearTimeout(timeout);
  }
};

