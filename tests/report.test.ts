import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicPropertyResponse } from "../shared/property";
import { destinationKind, propertyShareUrl, validateAddress } from "../src/lib/report";

const property = buildPublicPropertyResponse({ results: [{ county: "Lee", parcelId: "9612-95-5442-00", siteAddress: "800 CREEKWOOD RD" }] }, "800 Creekwood Rd, Sanford, NC 27330").results[0];

test("a matched parcel does not make a generic GIS homepage a direct link", () => {
  assert.equal(property.hasCountyRecord, true);
  assert.equal(destinationKind("https://lee-arcgis.leecountync.gov/parcelmap/", property), "website");
  assert.equal(destinationKind("https://county.example/?taxyr=2027", property), "website");
  assert.equal(destinationKind("https://county.example/?pin=99999999", property), "website");
  assert.equal(destinationKind("https://county.example/?pin=9612955442009", property), "website");
});

test("identifies the current parcel in query, path and hash destinations", () => {
  for (const href of ["https://county.example/card?pin=961295544200&taxyr=2027", "https://county.example/9612-95-5442-00.pdf", "https://county.example/map#parcel=9612%2D95%2D5442%2D00"]) {
    assert.equal(destinationKind(href, property), "record");
  }
});

test("address searches remain searches rather than verified property pages", () => {
  for (const href of ["https://www.google.com/maps/search/?api=1&query=800+Creekwood+Rd", "https://msc.fema.gov/portal/search?AddressQuery=800+Creekwood+Rd", "https://www.zillow.com/homes/800-Creekwood-Rd-Sanford-NC-27330_rb/"]) {
    assert.equal(destinationKind(href, property), "search");
  }
  assert.equal(destinationKind("https://county.example/?q=flood"), "website");
  assert.equal(destinationKind("javascript:alert(961295544200)", property), "website");
  assert.equal(destinationKind("not a URL", property), "website");
});

test("address validation gives useful feedback without restricting county formats", () => {
  assert.ok(validateAddress("  "));
  assert.ok(validateAddress("123"));
  assert.ok(validateAddress("A".repeat(181)));
  assert.equal(validateAddress("800 Creekwood Rd, Sanford, NC 27330"), "");
  assert.equal(validateAddress("NC Highway 21, Elkin, NC"), "");
});

test("shared reports use only the current public address and parcel", () => {
  const url = new URL(propertyShareUrl("https://home.example/?address=old&unrelated=value#hazards", property));
  assert.equal(url.searchParams.get("address"), property.searchedAddress);
  assert.equal(url.searchParams.get("parcel"), property.parcelId);
  assert.equal(url.searchParams.has("unrelated"), false);
  assert.equal(url.hash, "");
});
