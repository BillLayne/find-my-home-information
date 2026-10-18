import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Bath, BedDouble, Briefcase, Building2, CalendarDays, Camera, CheckCircle2, ChevronRight, Coins, Copy, ExternalLink, FileSearch, FileText, FolderSearch, Home, Info, LandPlot, Layers, MapPin, Pencil, Phone, Printer, Share2, Shield, ShieldCheck, Trees, Warehouse, Waves } from "lucide-react";
import type { PublicProperty, PublicPropertyResponse } from "../shared/property";
import { destinationKind, destinationLabel, propertyShareUrl, type DestinationKind } from "./lib/report";
import { ParcelMap } from "./ParcelMap";

const IMG_REPORT_BANNER = "https://img.billlayneinsurance.com/i/2026/10/a-clearer-picture-of-home-p9t9ps.webp";

type ResourceLink = {
  label: string; description: string; href?: string; icon: typeof MapPin;
  source: "Official" | "Third party" | "Agency resource"; kind?: DestinationKind;
};

const AGENCY_RESOURCES: ResourceLink[] = [
  { label: "Create a home inventory", description: "Photograph rooms and prepare a downloadable belongings inventory.", href: "https://billlayne.github.io/HOME-INVENTORY/", icon: Camera, source: "Agency resource" },
  { label: "Claims inventory worksheet", description: "Organize damaged or missing belongings after a covered loss.", href: "https://www.billlayneinsurance.com/claims-center/claims-inventory.html", icon: FileText, source: "Agency resource" },
  { label: "Send documents securely", description: "Send policy documents, photographs, inspections, or lender information.", href: "https://www.sendbilldocs.com/", icon: FolderSearch, source: "Agency resource" },
];

// County records are stored in capitals. Show the heading in title case; the
// copy buttons and outbound links still use the record exactly as supplied.
const KEEP_UPPER = new Set(["NC", "US", "NE", "NW", "SE", "SW", "PO", "II", "III", "IV"]);
function displayAddress(value: string) {
  if (value !== value.toUpperCase()) return value;
  return value.split(" ").map((word) => KEEP_UPPER.has(word) || /\d/.test(word) ? word : word.charAt(0) + word.slice(1).toLowerCase()).join(" ");
}

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function resourcesFor(property: PublicProperty) {
  const links = property.links;
  const gisKind = destinationKind(links.gisParcel || links.gis, property);
  const resources: Record<"records" | "photos" | "hazards", ResourceLink[]> = {
    records: [
      { label: "County GIS & aerial map", description: gisKind === "record" ? "County parcel boundaries and available aerial imagery for this property." : "County mapping and available aerial imagery. A manual address or parcel search may be required.", href: links.gisParcel || links.gis, icon: LandPlot, source: "Official" },
      { label: "County property card", description: "Available county assessment and building details.", href: links.taxCard, icon: FileSearch, source: "Official" },
      { label: "Deed & ownership records", description: "Available deed records or the county's public document search.", href: links.deed, icon: Building2, source: "Official" },
    ],
    photos: [
      { label: "Google Maps & Street View", description: "Search this address for nearby roads and available street-level imagery.", href: links.googleMaps, icon: MapPin, source: "Third party" },
      { label: "Zillow photos & home details", description: "Search for available home photos, estimates, and listing history. Availability varies.", href: links.zillow, icon: Camera, source: "Third party" },
    ],
    hazards: [
      { label: "FEMA flood map", description: "Search the official FEMA Map Service Center using this address.", href: links.fema, icon: Waves, source: "Official" },
      { label: "NC Flood Risk Information System", description: "Explore North Carolina flood maps and risk information.", href: links.ncFlood, icon: ShieldCheck, source: "Official" },
      { label: "ReadyNC hazard resources", description: "North Carolina emergency and hazard preparedness resources.", href: links.readyNc, icon: AlertTriangle, source: "Official" },
    ],
  };
  for (const group of Object.values(resources)) {
    for (const link of group) link.kind = destinationKind(link.href, property);
  }
  return resources;
}

function ResourceGroup({
  id,
  title,
  subtitle,
  icon: GroupIcon,
  links,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof FileText;
  links: ResourceLink[];
}) {
  const available = links.filter((link) => link.href);
  return (
    <section id={id} className="resource-section" aria-labelledby={`${id}-title`}>
      <div className="resource-card-header">
        <span className="resource-card-header-icon" aria-hidden="true">
          <GroupIcon size={26} strokeWidth={1.75} />
        </span>
        <div>
          <h3 id={`${id}-title`}>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {available.length ? (
        <div className="resource-grid">
          {available.map(({ icon: Icon, ...link }) => (
            <a key={link.label} className="resource-item" href={link.href} target="_blank" rel="noopener noreferrer">
              <span className="resource-icon">
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="resource-copy">
                <strong>{link.label}</strong>
                <small>{link.description}</small>
                <span className="resource-meta">
                  <span>{link.source}</span>
                  {link.kind && (
                    <span className={`destination destination--${link.kind}`}>{destinationLabel(link.kind)}</span>
                  )}
                </span>
              </span>
              <ExternalLink className="resource-arrow" size={17} aria-hidden="true" />
              <span className="sr-only">Opens in a new tab</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="section-intro">No links were returned for this section.</p>
      )}
    </section>
  );
}

export function PropertyReport({ property, response, selectedIndex, onSelect, onChangeAddress, quoteHref, editor, editing }: {
  property: PublicProperty; response: PublicPropertyResponse; selectedIndex: number;
  onSelect: (index: number) => void; onChangeAddress: () => void; quoteHref: string; editor: ReactNode; editing: boolean;
}) {
  const resources = useMemo(() => resourcesFor(property), [property]);
  const [activeSection, setActiveSection] = useState("property-overview");
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("");
  const [copyFallback, setCopyFallback] = useState<{ label: string; value: string } | null>(null);
  const [sharing, setSharing] = useState(false);
  const sections = useMemo(() => [
    { id: "property-overview", label: "Overview" },
    ...(property.parcelRings?.length ? [{ id: "parcel-map", label: "Parcel map" }] : []),
    { id: "records", label: "Records" }, { id: "photos-maps", label: "Photos" },
    { id: "hazards", label: "Hazards" }, { id: "insurance-resources", label: "Resources" },
  ], [property.parcelRings]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const threshold = (document.querySelector(".result-nav")?.getBoundingClientRect().height || 60) + 40;
      let current = sections[0].id;
      for (const section of sections) {
        // On wide screens the parcel map sits beside the overview, not below it.
        if (section.id === "parcel-map" && window.innerWidth > 900) continue;
        if ((document.getElementById(section.id)?.getBoundingClientRect().top ?? Infinity) <= threshold) current = section.id;
      }
      setActiveSection(current);
      frame = 0;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, [sections]);

  function jumpTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  }

  async function copy(value: string, label: string) {
    setCopyFallback(null);
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} copied.`);
    } catch {
      setStatus(`Automatic copying is unavailable. Select the ${label.toLowerCase()} below to copy it.`);
      setCopyFallback({ label, value });
    }
  }

  async function share() {
    const url = propertyShareUrl(window.location.href, property);
    if (!navigator.share) return copy(url, "Report link");
    setSharing(true);
    try {
      await navigator.share({ title: `Home information for ${property.officialAddress}`, text: `Public property information and links for ${property.officialAddress}.`, url });
      setStatus("Property report shared.");
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) await copy(url, "Report link");
    } finally { setSharing(false); }
  }

  function handlePrint() {
    window.dispatchEvent(new Event("resize"));
    window.setTimeout(() => {
      window.print();
    }, 60);
  }

  const extraImprovementsValue =
    property.totalValue != null &&
    property.buildingValue != null &&
    property.landValue != null &&
    property.totalValue - property.buildingValue - property.landValue > 0
      ? property.totalValue - property.buildingValue - property.landValue
      : undefined;

  const deedRef =
    property.deedBook && property.deedPage
      ? `Book ${property.deedBook}, Pg ${property.deedPage}`
      : property.deedBook
        ? `Book ${property.deedBook}`
        : undefined;

  const facts = [
    { label: "Heated area", icon: Home, value: property.heatedArea ? `${formatNumber(property.heatedArea)} sq ft` : undefined },
    { label: "Year built", icon: CalendarDays, value: property.yearBuilt ? `${property.yearBuilt}${property.effectiveYearBuilt && property.effectiveYearBuilt !== property.yearBuilt ? ` (Eff. ${property.effectiveYearBuilt})` : ""}` : undefined },
    { label: "Acreage", icon: Trees, value: property.totalAcres == null ? undefined : `${formatNumber(property.totalAcres)} ${property.totalAcres === 1 ? "acre" : "acres"}` },
    { label: "Bedrooms", icon: BedDouble, value: property.bedrooms == null ? undefined : String(property.bedrooms) },
    { label: "Bathrooms", icon: Bath, value: property.fullBaths == null ? undefined : `${property.fullBaths} full${property.halfBaths ? `, ${property.halfBaths} half` : ""}` },
    { label: "Tax assessed value", icon: Coins, value: property.totalValue == null ? undefined : formatCurrency(property.totalValue), isTaxValue: true },
    { label: "Building value", icon: Building2, value: property.buildingValue == null ? undefined : formatCurrency(property.buildingValue) },
    { label: "Land value", icon: LandPlot, value: property.landValue == null ? undefined : formatCurrency(property.landValue) },
    { label: "Stories", icon: Layers, value: property.stories == null ? undefined : `${property.stories} ${property.stories === 1 ? "story" : "stories"}` },
    { label: "Exterior", icon: Layers, value: property.exteriorWall },
    { label: "Roof", icon: Warehouse, value: property.roofCover || property.roofStructure },
    { label: "Foundation / Heat", icon: Home, value: [property.foundation, property.heatingType].filter(Boolean).join(" · ") || undefined },
    { label: "Deed reference", icon: FileText, value: deedRef },
  ].filter((fact): fact is { label: string; icon: typeof MapPin; value: string; isTaxValue?: boolean } => Boolean(fact.value));
  const factColumns = facts.length === 1 ? 1 : facts.length === 2 || facts.length === 4 ? 2 : 3;
  const shortcuts = [
    { ...resources.records[1], label: "Property card", hint: "County records" },
    { ...resources.records[0], label: "GIS & aerial map", hint: "Parcel details" },
    { ...resources.photos[0], label: "Street View", hint: "Explore the address" },
    { ...resources.hazards[0], label: "FEMA flood map", hint: "Check mapped flood zones" },
  ].filter((link) => link.href);
  const parcel = property.parcelId || property.pin;
  const hasMap = Boolean(property.parcelRings?.length);
  const countyLabel = property.county === "North Carolina" ? "North Carolina" : `${property.county} County`;

  const reportDateObj = response.generatedAt ? new Date(response.generatedAt) : new Date();
  const formattedReportDate = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(Number.isNaN(reportDateObj.getTime()) ? new Date() : reportDateObj);

  const coordinatesLabel =
    property.latitude != null && property.longitude != null
      ? `${property.latitude.toFixed(4)}° N, ${Math.abs(property.longitude).toFixed(4)}° W`
      : "NC Public GIS";

  return <>
    {/* ==================== PRINT-ONLY LETTERHEAD HEADER ==================== */}
    <div className="print-only print-letterhead-top">
      <table className="print-hdr-table">
        <tbody>
          <tr>
            <td className="print-hdr-logo">
              <img src="/agency-logo.png" alt="Bill Layne Insurance Agency" loading="eager" />
            </td>
            <td className="print-hdr-box">
              <div className="print-docbox">
                <div className="print-docbox-cap">PROPERTY REFERENCE DOSSIER</div>
                <table>
                  <tbody>
                    <tr>
                      <td className="k">Report Date</td>
                      <td className="v">{formattedReportDate}</td>
                    </tr>
                    <tr>
                      <td className="k">Jurisdiction</td>
                      <td className="v">{countyLabel}, NC</td>
                    </tr>
                    <tr>
                      <td className="k">Parcel / PIN</td>
                      <td className="v">{parcel || "County Lookup"}</td>
                    </tr>
                    <tr>
                      <td className="k">Record Status</td>
                      <td className="v">{property.hasCountyRecord ? "Verified County Parcel" : "Address Located"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <hr className="print-rule-navy" />
      <div className="print-rule-gold" />

      <div className="print-subject-bar">
        <div className="print-subject-title">
          NORTH CAROLINA PROPERTY &amp; HOME INSURANCE REFERENCE REPORT &mdash; {displayAddress(property.officialAddress)}
        </div>
        <div className="print-subject-meta">
          <span><strong>Searched Address:</strong> {property.searchedAddress}</span>
          <span>&bull;</span>
          <span><strong>Coordinates:</strong> {coordinatesLabel}</span>
          {deedRef && (
            <>
              <span>&bull;</span>
              <span><strong>Deed:</strong> {deedRef}</span>
            </>
          )}
        </div>
      </div>
    </div>

    <header className="report-header">
      <div className="report-heading">
        <p className="report-eyebrow">Your property report</p>
        <div className="address-line">
          <h2 id="property-address">{displayAddress(property.officialAddress)}</h2>
          <button className="icon-button" type="button" aria-label="Copy address" title="Copy address" onClick={() => void copy(property.recordAddressDiffers ? property.officialAddress : property.searchedAddress, "Address")}><Copy size={17} aria-hidden="true" /></button>
        </div>
        <div className="report-meta">
          <span>{countyLabel}</span>
          {parcel && <><span className="meta-dot" aria-hidden="true">&bull;</span><span>Parcel {parcel}</span>
            <button className="icon-button" type="button" aria-label="Copy parcel number" title="Copy parcel number" onClick={() => void copy(parcel, "Parcel number")}><Copy size={16} aria-hidden="true" /></button></>}
          <span className={property.hasCountyRecord ? "verified-badge" : "limited-badge"}>{property.hasCountyRecord ? <CheckCircle2 size={15} aria-hidden="true" /> : <AlertTriangle size={15} aria-hidden="true" />}
            {property.matchMethod === "parcel-point" ? "Parcel matched by location" : property.hasCountyRecord ? "County record matched" : "Address located; limited records"}
          </span>
        </div>
      </div>
      <div className="report-header-actions">
        <button id="change-address" type="button" onClick={onChangeAddress} disabled={editing}><Pencil size={17} aria-hidden="true" />Change address</button>
        <button type="button" onClick={handlePrint}><Printer size={17} aria-hidden="true" />Print / Save PDF</button>
        <button type="button" onClick={() => void share()} disabled={sharing}><Share2 size={17} aria-hidden="true" />Share</button>
      </div>
    </header>
    <p className="report-status" role="status" aria-live="polite">{status}</p>
    {copyFallback && <label className="copy-fallback">{copyFallback.label}<input readOnly value={copyFallback.value} onFocus={(event) => event.target.select()} /></label>}

    <nav className="result-nav" aria-label="Property report sections">
      <div className="result-nav-links">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={activeSection === section.id ? "location" : undefined}
            onClick={(event) => {
              event.preventDefault();
              jumpTo(section.id);
            }}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
    {editor}
    {response.results.length > 1 && <fieldset className="result-picker" disabled={editing}>
      <legend>{response.results.length} possible properties</legend>
      {response.results.map((item, index) => <button key={item.id} type="button" aria-pressed={index === selectedIndex} onClick={() => onSelect(index)}>
        <span>{item.officialAddress}</span><small>{item.parcelId || item.pin || item.county}</small>{index === selectedIndex && <CheckCircle2 size={18} aria-hidden="true" />}
      </button>)}
    </fieldset>}

    {/* 1. PROPERTY SUMMARY AND PARCEL MAP */}
    <section id="property-overview" className="property-summary" aria-labelledby="property-address">
      {property.recordAddressDiffers && <div className="notice address-notice"><MapPin size={21} /><div><strong>The county uses a different property address.</strong><span>You searched {property.searchedAddress}. This is the parcel returned for that location. Confirm the address and boundary before relying on this record.</span></div></div>}
      <div className={`overview-grid${hasMap ? "" : " overview-grid--single"}`}>
        <div className="glance-card">
          <div className="screen-only">
            <h3>Property at a glance</h3>
            {!property.hasCountyRecord ? (
              <div className="notice limited-record-notice">
                <AlertTriangle size={21} />
                <div>
                  <strong>Address found. Automatic parcel details are unavailable.</strong>
                  <span>{response.note || "Use the county search and statewide resources below. No property facts have been assumed."}</span>
                </div>
              </div>
            ) : facts.length ? (
              <>
                <dl className={`fact-grid fact-grid--${factColumns}`}>
                  {facts.map(({ icon: Icon, ...fact }) => (
                    <div key={fact.label} className={fact.isTaxValue ? "fact-card--tax" : undefined}>
                      <dt>
                        <Icon size={28} strokeWidth={1.6} aria-hidden="true" />
                        {fact.label}
                      </dt>
                      <dd>
                        <span>{fact.value}</span>
                        {fact.isTaxValue && (
                          <button
                            type="button"
                            className="tax-rebuild-inline-link"
                            onClick={() => setExpanded((prev) => !prev)}
                            aria-expanded={expanded}
                            aria-controls="rebuild-details"
                          >
                            Tax value is not rebuild cost
                            <ExternalLink size={12} aria-hidden="true" />
                          </button>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {expanded && property.totalValue != null && (
                  <div id="rebuild-details" className="rebuild-inline-drawer" role="region" aria-label="Tax value versus rebuild cost">
                    <div className="rebuild-inline-grid">
                      <div>
                        <h4>Tax value</h4>
                        <p>Set by the county to bill property taxes. It includes the land and may reflect a revaluation from several years ago.</p>
                      </div>
                      <div>
                        <h4>Rebuild cost</h4>
                        <p>Today&apos;s materials and labor to rebuild the same home. The land is not included because you would still own it.</p>
                      </div>
                      <div>
                        <h4>Why they differ</h4>
                        <p>Building costs change, and older homes can cost more to rebuild than their tax value suggests. Confirm the rebuild figure rather than assuming they match.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="notice limited-record-notice">
                <FileSearch size={21} />
                <div>
                  <strong>Parcel matched; building details were not supplied.</strong>
                  <span>Check the available property card or county website for further details.</span>
                </div>
              </div>
            )}
          </div>

          {/* PRINT-ONLY STRUCTURED COUNTY RECORD TABLE */}
          <div className="print-only print-record-panel">
            <div className="print-panel-cap">1. OFFICIAL COUNTY ASSESSMENT &amp; PROPERTY SUMMARY</div>
            <table className="print-data-table">
              <tbody>
                <tr>
                  <td className="k">Total Tax Value</td>
                  <td className="v">{property.totalValue != null ? formatCurrency(property.totalValue) : "See Tax Card"}</td>
                  <td className="k">Assessed Building</td>
                  <td className="v">{property.buildingValue != null ? formatCurrency(property.buildingValue) : "See Tax Card"}</td>
                </tr>
                <tr>
                  <td className="k">Assessed Land</td>
                  <td className="v">{property.landValue != null ? formatCurrency(property.landValue) : "See Tax Card"}</td>
                  <td className="k">{extraImprovementsValue != null ? "Outbuildings / Other" : "Lot Acreage"}</td>
                  <td className="v">
                    {extraImprovementsValue != null
                      ? formatCurrency(extraImprovementsValue)
                      : property.totalAcres != null
                        ? `${formatNumber(property.totalAcres)} acres`
                        : "See GIS"}
                  </td>
                </tr>
                <tr>
                  <td className="k">Lot Size / Acres</td>
                  <td className="v">{property.totalAcres != null ? `${formatNumber(property.totalAcres)} ${property.totalAcres === 1 ? "acre" : "acres"}` : "See GIS"}</td>
                  <td className="k">Deed Reference</td>
                  <td className="v">{deedRef || "County Register"}</td>
                </tr>
                <tr>
                  <td className="k">Year Built / Stories</td>
                  <td className="v">
                    {property.yearBuilt || property.stories
                      ? [
                          property.yearBuilt ? `Built ${property.yearBuilt}` : null,
                          property.stories ? `${property.stories} Story` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Verify on Tax Card"}
                  </td>
                  <td className="k">Heated Living Area</td>
                  <td className="v">{property.heatedArea ? `${formatNumber(property.heatedArea)} sq ft` : "Verify on Tax Card"}</td>
                </tr>
                <tr>
                  <td className="k">Bedrooms / Baths</td>
                  <td className="v">
                    {property.bedrooms != null || property.fullBaths != null
                      ? [
                          property.bedrooms != null ? `${property.bedrooms} Bed` : null,
                          property.fullBaths != null ? `${property.fullBaths} Full${property.halfBaths ? ` / ${property.halfBaths} Half` : ""} Bath` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Verify on Tax Card"}
                  </td>
                  <td className="k">Exterior / Roof</td>
                  <td className="v">
                    {[property.exteriorWall, property.roofCover || property.roofStructure].filter(Boolean).join(" · ") || "Confirm Below"}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="print-record-footnote">
              Source: {countyLabel} GIS &amp; NC OneMap public parcel records. Tax assessment values are for county tax billing only and do not represent insurance replacement cost.
            </p>
          </div>
        </div>
        <ParcelMap property={property} />
      </div>

      {/* 2. FOUR QUICK LINKS */}
      <div id="home-links" className="home-links-section">
        <div className="home-links-grid">
          {shortcuts.map(({ icon: Icon, ...link }) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
              <Icon size={30} strokeWidth={1.6} aria-hidden="true" />
              <span>
                <strong>{link.label}</strong>
                <small>{link.hint}</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
              <span className="sr-only">Opens in a new tab</span>
            </a>
          ))}
        </div>
      </div>

      {/* 3. NEW PHOTO BANNER (3:1 Desktop / Dedicated Portrait Mobile) */}
      <div className="report-photo-banner screen-only" aria-label="A clearer picture of home">
        <img
          className="report-banner-desktop"
          src={IMG_REPORT_BANNER}
          alt="A clearer picture of home. Explore the records. Understand the details. Plan your protection. Illustrative neighborhood photo."
          loading="lazy"
          decoding="async"
        />
        <div className="report-banner-mobile">
          <img
            className="report-banner-mobile-bg"
            src={IMG_REPORT_BANNER}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
          />
          <div className="report-banner-mobile-overlay" aria-hidden="true" />
          <div className="report-banner-mobile-copy">
            <h3>
              A clearer picture
              <br />
              of home.
            </h3>
            <p>Explore the records. Understand the details. Plan your protection.</p>
            <span className="report-banner-gold-bar" aria-hidden="true" />
          </div>
          <span className="report-banner-photo-badge">Illustrative neighborhood photo</span>
        </div>
      </div>
    </section>

    {/* 4. FOUR RESOURCE SECTIONS IN A TWO-COLUMN DESKTOP GRID */}
    <div className="resource-sections-grid screen-only">
      <ResourceGroup
        id="records"
        title="Property records"
        subtitle="Official county records and property details."
        icon={FileText}
        links={resources.records}
      />
      <ResourceGroup
        id="photos-maps"
        title="Photos & surroundings"
        subtitle="See the home and nearby area."
        icon={Camera}
        links={resources.photos}
      />
      <ResourceGroup
        id="hazards"
        title="Flood & preparedness"
        subtitle="Explore flood maps and emergency resources."
        icon={Shield}
        links={resources.hazards}
      />
      <ResourceGroup
        id="insurance-resources"
        title="Your home toolkit"
        subtitle="Practical resources to prepare and protect."
        icon={Briefcase}
        links={AGENCY_RESOURCES}
      />
    </div>

    <div className="report-disclaimer-bar screen-only" role="note">
      <Info size={19} strokeWidth={1.9} aria-hidden="true" />
      <p>
        Public records may be incomplete or outdated. Flood resources do not replace an official determination, and insurance quotes require a separate review.
      </p>
    </div>

    {/* 5. INSURANCE-REVIEW PANEL */}
    <section className="closing-band screen-only">
      <div>
        <p className="eyebrow">
          <span className="eyebrow-dash" aria-hidden="true" />
          BILL LAYNE INSURANCE
        </p>
        <h3>Know your home. Understand your coverage.</h3>
        <p>Our local team can help verify the details carriers use and explain what still needs to be confirmed.</p>
      </div>
      <div className="closing-actions">
        <a href={quoteHref}>
          Request an insurance review <ArrowRight size={18} aria-hidden="true" />
        </a>
        <a href="tel:3368351993">
          <Phone size={18} aria-hidden="true" />
          Call 336-835-1993
        </a>
      </div>
    </section>

    {/* ==================== PRINT-ONLY LETTERHEAD DOSSIER BODY & FOOTER ==================== */}
    <div className="print-only print-dossier-bottom">
      <div className="print-section-block">
        <div className="print-panel-cap">2. UNDERSTANDING YOUR FIGURES &mdash; COUNTY TAX VALUE VS. INSURANCE REBUILD COST</div>
        <table className="print-comparison-table">
          <tbody>
            <tr>
              <td>
                <strong>County Tax Assessment ({property.totalValue != null ? formatCurrency(property.totalValue) : "Tax Value"})</strong>
                <p>
                  Used by {countyLabel} for property tax billing on a multi-year revaluation schedule. Total tax value includes land ({property.landValue != null ? formatCurrency(property.landValue) : "land value"}), which does not burn or blow away.
                </p>
              </td>
              <td>
                <strong>Dwelling Rebuild Cost (Coverage A)</strong>
                <p>
                  Based on 100% of today&apos;s local NC construction labor, lumber, roofing, and debris removal to rebuild the home from the ground up (excluding land).
                </p>
              </td>
              <td>
                <strong>Why Confirming Details Matters</strong>
                <p>
                  County tax records often miss roof replacements, HVAC/plumbing upgrades, or finished areas. Confirming updates below prevents coverage gaps and unlocks policy discounts.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="print-section-block">
        <div className="print-panel-cap">3. HOMEOWNER PROPERTY &amp; DISCOUNT VERIFICATION WORKSHEET (KEEP FOR YOUR HOME FILE)</div>
        <table className="print-worksheet-table">
          <tbody>
            <tr>
              <th scope="row">Roofing System<br /><span>Biggest NC Rate Factor</span></th>
              <td>
                Year Installed: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> &nbsp;&bull;&nbsp;
                &#9744; Architectural Shingle &nbsp; &#9744; 3-Tab Shingle &nbsp; &#9744; Metal &nbsp; &#9744; Other: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>
              </td>
            </tr>
            <tr>
              <th scope="row">Home Systems<br /><span>Updates &amp; Credits</span></th>
              <td>
                HVAC Year: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> &nbsp;&bull;&nbsp;
                Water Heater Year: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> &nbsp;&bull;&nbsp;
                Plumbing Year: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> &nbsp;&bull;&nbsp;
                Electrical: &#9744; 100A &nbsp; &#9744; 200A+ (Yr: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>)
              </td>
            </tr>
            <tr>
              <th scope="row">Protective Credits<br /><span>Policy Discounts</span></th>
              <td>
                &#9744; Central Monitored Alarm &nbsp;&nbsp; &#9744; Smoke/CO Detectors + Deadbolts &nbsp;&nbsp; &#9744; Fire Extinguisher &nbsp;&nbsp; &#9744; Water Shutoff / Leak Sensor &nbsp;&nbsp; &#9744; Generator
              </td>
            </tr>
            <tr>
              <th scope="row">Other Structures<br /><span>Coverage B &amp; Liability</span></th>
              <td>
                &#9744; Detached Garage / Workshop &nbsp;&nbsp; &#9744; Storage Shed / Barn &nbsp;&nbsp; &#9744; Deck / Screened Porch &nbsp;&nbsp; &#9744; Finished Basement &nbsp;&nbsp; &#9744; Wood Stove &nbsp;&nbsp; &#9744; Pool / Trampoline
              </td>
            </tr>
            <tr>
              <th scope="row">Coverage Notes<br /><span>Current Policy Check</span></th>
              <td>
                Current Carrier: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> &nbsp;&bull;&nbsp;
                Renewal Date: <u>&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;/20&nbsp;&nbsp;&nbsp;&nbsp;</u> &nbsp;&bull;&nbsp;
                Preferred Deductible: &#9744; $1,000 &nbsp; &#9744; $2,500 &nbsp; &#9744; Other: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="print-bottom-split">
        <tbody>
          <tr>
            <td className="print-links-cell">
              <div className="print-panel-cap">4. OFFICIAL PROPERTY PORTALS &amp; PREPAREDNESS LINKS</div>
              <table className="print-links-table">
                <tbody>
                  <tr>
                    <td className="k">County Tax Card</td>
                    <td className="v">
                      {property.links.taxCard ? (
                        <a href={property.links.taxCard}>{countyLabel} Official Parcel Tax Card &amp; Building Record &rarr;</a>
                      ) : (
                        <span>Search {countyLabel} Tax Assessor Portal using Parcel {parcel || "ID"}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="k">County GIS Map</td>
                    <td className="v">
                      {property.links.gisParcel || property.links.gis ? (
                        <a href={property.links.gisParcel || property.links.gis}>{countyLabel} Interactive GIS &amp; Aerial Map &rarr;</a>
                      ) : (
                        <span>NC OneMap &amp; County GIS Parcel Viewer</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="k">Flood Resources</td>
                    <td className="v">
                      <a href={property.links.fema}>FEMA Flood Map (msc.fema.gov)</a> &nbsp;&bull;&nbsp;{" "}
                      <a href={property.links.ncFlood}>NC Flood Risk Info System (fris.nc.gov)</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="k">Home Inventory</td>
                    <td className="v">
                      <a href="https://billlayne.github.io/HOME-INVENTORY/">Room-by-Room Inventory (billlayne.github.io/HOME-INVENTORY)</a> &nbsp;&bull;&nbsp;{" "}
                      <a href="https://www.sendbilldocs.com/">SendBillDocs.com</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td className="print-cta-cell">
              <div className="print-agency-box">
                <div className="print-agency-box-cap">FREE NC COVERAGE REVIEW</div>
                <div className="print-agency-box-body">
                  <strong>Bill Layne Insurance Agency</strong>
                  <p>Bring or email this sheet to verify your rebuild estimate, roof age, and available NC home discounts.</p>
                  <div className="print-agency-contact">
                    <div><strong>Call:</strong> 336-835-1993 &bull; <strong>Text:</strong> 336-827-9065</div>
                    <div><strong>Email:</strong> Save@BillLayneInsurance.com</div>
                    <div><strong>Web:</strong> www.BillLayneInsurance.com</div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="print-letterhead-foot">
        <div>
          <span className="a">Bill Layne Insurance Agency</span> &nbsp;&bull;&nbsp; 1283 N Bridge St, PO Box 827, Elkin, NC 28621
          &nbsp;&bull;&nbsp; Phone 336-835-1993 &nbsp;&bull;&nbsp; Text 336-827-9065 &nbsp;&bull;&nbsp; Save@BillLayneInsurance.com
          &nbsp;&bull;&nbsp; www.BillLayneInsurance.com &nbsp;&bull;&nbsp; <span className="g">Serving North Carolina since 2005</span>
        </div>
        <div className="print-foot-disclaimer">
          Informational public-record summary only. County tax records may be incomplete or outdated, flood links do not replace an official flood zone determination or survey, and this report is not an insurance binder or quote.
        </div>
      </div>
    </div>
  </>;
}
