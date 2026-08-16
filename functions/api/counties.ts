import { buildCountyCoverageUrl, countIntegratedCounties, DEFAULT_PROPERTY_LOOKUP_URL } from "../../shared/coverage";

type Env = {
  PROPERTY_LOOKUP_URL?: string;
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(buildCountyCoverageUrl(env.PROPERTY_LOOKUP_URL || DEFAULT_PROPERTY_LOOKUP_URL), {
      headers: { "User-Agent": "BillLayneInsurance-FindMyHome/1.0" },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    const count = countIntegratedCounties(payload);
    if (!response.ok || count == null) return json({ error: "County coverage is unavailable." }, 502);
    return json({ count });
  } catch {
    return json({ error: "County coverage is unavailable." }, 502);
  } finally {
    clearTimeout(timeout);
  }
};
