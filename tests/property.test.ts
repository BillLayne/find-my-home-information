import assert from "node:assert/strict";
import test from "node:test";
import { buildFemaLink, buildPublicPropertyResponse } from "../shared/property";

const UPSTREAM = {
  formattedAddress: "13 Windbrook Ln, Sylva, North Carolina, 28779",
  county: "Jackson",
  results: [{
    county: "Jackson",
    parcelId: "7539-09-8442",
    owner: "PRIVATE OWNER SHOULD NOT BE COPIED",
    mailingAddress: "PRIVATE MAILING ADDRESS SHOULD NOT BE COPIED",
    siteAddress: "13 MIRROWEN HOLW",
    totalAcres: 0.92,
    totalValue: 235024,
    taxCardLink: "https://gis.jacksonnc.org/PRC/PRC/7539098442.pdf",
    googleMapsLink: "https://www.google.com/maps/search/?api=1&query=13%20Windbrook%20Ln",
  }],
};

test("returns consumer-safe property fields without owner or mailing data", () => {
  const response = buildPublicPropertyResponse(UPSTREAM, "13 Windbrook Ln, Sylva, NC", new Date("2026-07-15T12:00:00Z"));
  const property = response.results[0];

  assert.equal(property.parcelId, "7539-09-8442");
  assert.equal(property.totalAcres, 0.92);
  assert.equal(property.recordAddressDiffers, true);
  assert.equal("owner" in property, false);
  assert.equal("mailingAddress" in property, false);
  assert.equal(response.generatedAt, "2026-07-15T12:00:00.000Z");
});

test("rejects unsafe external protocols while preserving official https links", () => {
  const response = buildPublicPropertyResponse({
    results: [{ county: "Test", siteAddress: "1 Main St", deedLink: "javascript:alert(1)", taxCardLink: "https://county.example/card.pdf" }],
  }, "1 Main St, NC");

  assert.equal(response.results[0].links.deed, undefined);
  assert.equal(response.results[0].links.taxCard, "https://county.example/card.pdf");
});

test("builds an address-specific official FEMA search link", () => {
  assert.equal(
    buildFemaLink("3090 US Hwy 21, Hamptonville, NC"),
    "https://msc.fema.gov/portal/search?AddressQuery=3090%20US%20Hwy%2021%2C%20Hamptonville%2C%20NC",
  );
});

