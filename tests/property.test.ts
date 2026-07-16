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
      latitude: 35.374,
      longitude: -83.214,
      parcelRings: [[[-83.215, 35.373], [-83.213, 35.373], [-83.213, 35.375], [-83.215, 35.373]]],
      matchMethod: "parcel-point",
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
  assert.equal(property.matchMethod, "parcel-point");
  assert.equal(property.hasCountyRecord, true);
  assert.equal(property.parcelRings?.[0].length, 4);
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

test("does not flag a matching street address when the geocoder adds city, state, and ZIP", () => {
  const response = buildPublicPropertyResponse({
    formattedAddress: "800 Creekwood Rd, Sanford, North Carolina, 27330",
    county: "Lee",
    results: [{
      county: "Lee",
      parcelId: "9612-95-5442-00",
      siteAddress: "800 CREEKWOOD ROAD",
    }],
  }, "800 Creekwood Rd, Sanford, NC 27330");

  assert.equal(response.results[0].recordAddressDiffers, false);
});

test("maps Watauga facts and official links without copying private owner fields", () => {
  const response = buildPublicPropertyResponse({
    formattedAddress: "104 Mockingbird Ln, Blowing Rock, North Carolina, 28605",
    county: "Watauga",
    results: [{
      county: "Watauga",
      parcelId: "1940-83-9925-000",
      owner: "OWNER MUST REMAIN PRIVATE",
      mailingAddress: "MAILING ADDRESS MUST REMAIN PRIVATE",
      siteAddress: "104 MOCKINGBIRD LN",
      heatedArea: 1566,
      yearBuilt: 1981,
      totalAcres: 0.78,
      totalValue: 484600,
      gisParcelLink: "https://gissvr.watgov.org/maps/?parcelId=1940-83-9925-000&UseSearch=no",
      taxCardLink: "https://tax.watgov.org/WataugaNC/Datalets/Datalet.aspx?mode=profileall&UseSearch=no&pin=1940-83-9925-000",
      deedLink: "https://us3.courthousecomputersystems.com/watauganc/",
    }],
  }, "104 Mockingbird Ln, Blowing Rock, NC");

  const property = response.results[0];
  assert.equal(property.county, "Watauga");
  assert.equal(property.heatedArea, 1566);
  assert.equal(property.yearBuilt, 1981);
  assert.equal(property.links.gisParcel?.includes("1940-83-9925-000"), true);
  assert.equal("owner" in property, false);
  assert.equal("mailingAddress" in property, false);
});
