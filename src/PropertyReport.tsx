import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Building2, Camera, CheckCircle2, ChevronDown, ChevronUp, Copy, ExternalLink, FileSearch, FileText, Flame, FolderSearch, LandPlot, MapPin, Phone, Printer, Search, Share2, ShieldCheck, Waves } from "lucide-react";
import type { PublicProperty, PublicPropertyResponse } from "../shared/property";
import { destinationKind, destinationLabel, propertyShareUrl, type DestinationKind } from "./lib/report";
import { ParcelMap } from "./ParcelMap";

type ResourceLink = {
  label: string; description: string; href?: string; icon: typeof MapPin;
  source: "Official" | "Third party" | "Agency resource"; kind?: DestinationKind;
};

const AGENCY_RESOURCES: ResourceLink[] = [
  { label: "Create a Home Inventory", description: "Photograph rooms and prepare a downloadable belongings inventory.", href: "https://billlayne.github.io/HOME-INVENTORY/", icon: Camera, source: "Agency resource" },
  { label: "Claims Inventory Worksheet", description: "Organize damaged or missing belongings after a covered loss.", href: "https://www.billlayneinsurance.com/claims-center/claims-inventory.html", icon: FileText, source: "Agency resource" },
  { label: "Send Documents Securely", description: "Send policy documents, photographs, inspections, or lender information.", href: "https://www.sendbilldocs.com/", icon: FolderSearch, source: "Agency resource" },
];

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function resourcesFor(property: PublicProperty) {
  const links = property.links;
  const gisKind = destinationKind(links.gisParcel || links.gis, property);
  const resources: Record<"records" | "photos" | "hazards", ResourceLink[]> = {
    records: [
      { label: "County GIS & aerial map", description: gisKind === "record" ? "County parcel boundaries and available aerial imagery for this property." : "County mapping and available aerial imagery. A manual address or parcel search may be required.", href: links.gisParcel || links.gis, icon: LandPlot, source: "Official" },
      { label: "County property card", description: "Available county assessment and building details.", href: links.taxCard, icon: FileSearch, source: "Official" },
      { label: "Deed & Register of Deeds", description: "Available deed records or the county's public document search.", href: links.deed, icon: Building2, source: "Official" },
    ],
    photos: [
      { label: "Google Maps & Street View", description: "Search this address for nearby roads and available street-level imagery.", href: links.googleMaps, icon: MapPin, source: "Third party" },
      { label: "Zillow photos & home details", description: "Search for available home photos, estimates, and listing history. Availability varies.", href: links.zillow, icon: Camera, source: "Third party" },
    ],
    hazards: [
      { label: "FEMA flood map", description: "Search the official FEMA Map Service Center using this address.", href: links.fema, icon: Waves, source: "Official" },
      { label: "NC Flood Risk Information System", description: "Explore North Carolina flood maps and risk information.", href: links.ncFlood, icon: ShieldCheck, source: "Official" },
      { label: "ReadyNC hazard resources", description: "North Carolina emergency and hazard preparedness resources.", href: links.readyNc, icon: Flame, source: "Official" },
    ],
  };
  for (const group of Object.values(resources)) {
    for (const link of group) link.kind = destinationKind(link.href, property);
  }
  return resources;
}

function ResourceGroup({ id, title, eyebrow, links }: { id: string; title: string; eyebrow: string; links: ResourceLink[] }) {
  const available = links.filter((link) => link.href);
  return <section id={id} className="resource-section" aria-labelledby={`${id}-title`}>
    <div className="section-heading"><p>{eyebrow}</p><h3 id={`${id}-title`}>{title}</h3></div>
    {available.length ? <div className="resource-grid">
      {available.map(({ icon: Icon, ...link }) => <a key={link.label} className="resource-item" href={link.href} target="_blank" rel="noopener noreferrer">
        <span className="resource-icon"><Icon size={22} aria-hidden="true" /></span>
        <span className="resource-copy"><strong>{link.label}</strong><small>{link.description}</small>
          <span className="resource-meta"><span>{link.source}</span>{link.kind && <span className={`destination destination--${link.kind}`}>{destinationLabel(link.kind)}</span>}</span>
        </span>
        <ExternalLink className="resource-arrow" size={18} aria-hidden="true" /><span className="sr-only">Opens in a new tab</span>
      </a>)}
    </div> : <p className="section-intro">No links were returned for this section.</p>}
  </section>;
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

  const facts = [
    { label: "Heated area", value: property.heatedArea ? `${formatNumber(property.heatedArea)} sq ft` : undefined },
    { label: "Year built", value: property.yearBuilt ? String(property.yearBuilt) : undefined },
    { label: "Acreage", value: property.totalAcres == null ? undefined : formatNumber(property.totalAcres) },
    { label: "Assessed value", value: property.totalValue == null ? undefined : formatCurrency(property.totalValue) },
    { label: "Bedrooms", value: property.bedrooms == null ? undefined : String(property.bedrooms) },
    { label: "Bathrooms", value: property.fullBaths == null ? undefined : `${property.fullBaths} full${property.halfBaths ? `, ${property.halfBaths} half` : ""}` },
    { label: "Exterior", value: property.exteriorWall },
    { label: "Roof", value: property.roofCover || property.roofStructure },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));
  const shortcuts = [
    { ...resources.records[1], label: "Property card" },
    { ...resources.records[0], label: "GIS & aerial map" },
    { ...resources.photos[0], label: "Street View" },
    { ...resources.hazards[0], label: "FEMA flood map" },
  ].filter((link) => link.href);
  const parcel = property.parcelId || property.pin;
  const manualSearch = resources.records.some((link) => link.href && link.kind === "website");

  return <>
    <nav className="result-nav" aria-label="Property report sections">
      <div className="result-nav-links">{sections.map((section) => <a key={section.id} href={`#${section.id}`} aria-current={activeSection === section.id ? "location" : undefined}>{section.label}</a>)}</div>
      <label className="mobile-section-select">Section<select aria-label="Report section" value={activeSection} onChange={(event) => jumpTo(event.target.value)}>{sections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>
      <button id="change-address" type="button" onClick={onChangeAddress} disabled={editing}><Search size={17} />Change address</button>
    </nav>
    {editor}
    {response.results.length > 1 && <fieldset className="result-picker" disabled={editing}>
      <legend>{response.results.length} possible properties</legend>
      {response.results.map((item, index) => <button key={item.id} type="button" aria-pressed={index === selectedIndex} onClick={() => onSelect(index)}>
        <span>{item.officialAddress}</span><small>{item.parcelId || item.pin || item.county}</small>{index === selectedIndex && <CheckCircle2 size={18} aria-hidden="true" />}
      </button>)}
    </fieldset>}

    <section id="property-overview" className="property-summary" aria-labelledby="property-address">
      <div className="summary-heading"><p className="eyebrow">Your property</p><h2 id="property-address">{property.officialAddress}</h2>
        <div className="badges"><span>{property.county === "North Carolina" ? "North Carolina" : `${property.county} County`}</span>{parcel && <span>Parcel {parcel}</span>}
          <span className={property.hasCountyRecord ? "verified-badge" : "limited-badge"}>{property.hasCountyRecord ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {property.matchMethod === "parcel-point" ? "Parcel matched by location" : property.hasCountyRecord ? "County record matched" : "Address located; limited records"}
          </span>
        </div>
      </div>
      {property.recordAddressDiffers && <div className="notice address-notice"><MapPin size={21} /><div><strong>The county uses a different property address.</strong><span>You searched {property.searchedAddress}. This is the parcel returned for that location. Confirm the address and boundary before relying on this record.</span></div></div>}
      {!property.hasCountyRecord ? <div className="notice limited-record-notice"><AlertTriangle size={21} /><div><strong>Address found. Automatic parcel details are unavailable.</strong><span>{response.note || "Use the county search and statewide resources below. No property facts have been assumed."}</span></div></div>
        : facts.length ? <><dl className={`fact-grid fact-grid--${Math.min(facts.length, 4)}`}>{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
          <p className="fact-source-note">County details.{facts.length < 8 ? " See the property card for more." : " Verify with the original source."}{property.totalValue != null ? " Tax value is not rebuild cost." : ""}</p></>
          : <div className="notice limited-record-notice"><FileSearch size={21} /><div><strong>Parcel matched; building details were not supplied.</strong><span>Check the available property card or county website for further details.</span></div></div>}

      <div id="home-links" className="home-links-section">
        <h3>Property shortcuts</h3>
        <div className="home-links-grid">{shortcuts.map(({ icon: Icon, ...link }) => <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
          <Icon size={21} aria-hidden="true" /><span><strong>{link.label}</strong><small>{link.kind === "record" ? "Property link" : link.kind === "search" ? "Address search" : link.source === "Official" ? "County website" : "General website"}</small></span><ExternalLink size={15} aria-hidden="true" /><span className="sr-only">Opens in a new tab</span>
        </a>)}</div>
      </div>
      <div className="report-tools">
        <div className="report-actions"><button type="button" onClick={() => window.print()}><Printer size={18} />Print / PDF</button><button type="button" onClick={() => void share()} disabled={sharing}><Share2 size={18} />Share report</button></div>
        <a className="review-link" href={quoteHref}>Request an insurance review <ArrowRight size={17} /></a>
      </div>
      <div className="copy-tools" aria-label="Property details to copy">
        <button type="button" onClick={() => void copy(property.recordAddressDiffers ? property.officialAddress : property.searchedAddress, "Address")}><Copy size={16} />Copy address</button>
        {parcel && <button type="button" onClick={() => void copy(parcel, "Parcel number")}><Copy size={16} />Copy parcel number</button>}
      </div>
      <p className="report-status" role="status" aria-live="polite">{status}</p>
      {copyFallback && <label className="copy-fallback">{copyFallback.label}<input readOnly value={copyFallback.value} onFocus={(event) => event.target.select()} /></label>}
    </section>

    <ParcelMap property={property} />
    <ResourceGroup id="records" eyebrow="County records" title="Assessments, parcel maps & deeds" links={resources.records} />
    {manualSearch && <aside className="manual-search"><AlertTriangle size={19} /><p>Some county sites require the address or parcel number for a manual search. A matched record does not guarantee a direct GIS link.</p></aside>}
    <ResourceGroup id="photos-maps" eyebrow="Photos & maps" title="See the home and nearby roads" links={resources.photos} />
    <ResourceGroup id="hazards" eyebrow="Hazard resources" title="Flood maps & preparedness" links={resources.hazards} />
    <p className="source-note">Outside websites open in a new tab and may require a search or acknowledgment. Links and public records can change; these resources are not a flood determination.</p>

    {property.totalValue != null && <section className="rebuild-explainer">
      <div className="rebuild-summary"><div className="section-heading"><p>Understanding the figures</p><h3>Tax value is not rebuild cost</h3></div><button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="rebuild-details">{expanded ? "Show less" : "Learn why"}{expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button></div>
      <p className="section-intro">The assessed value is used for property taxes. Home insurance considers what it would cost to rebuild the home today.</p>
      <div id="rebuild-details" className={`rebuild-details${expanded ? " is-open" : ""}`} aria-hidden={!expanded}>
        <div className="rebuild-grid">
          <div><h4>Tax value</h4><p>Set by the county to bill property taxes. It includes the land and may reflect a revaluation from several years ago.</p></div>
          <div><h4>Rebuild cost</h4><p>Today's materials and labor to rebuild the same home. The land is not included because you would still own it.</p></div>
          <div><h4>Why they differ</h4><p>Building costs change, and older homes can cost more to rebuild than their tax value suggests. Confirm the rebuild figure rather than assuming they match.</p></div>
        </div>
      </div>
    </section>}
    <ResourceGroup id="insurance-resources" eyebrow="More home resources" title="Prepare before and after a loss" links={AGENCY_RESOURCES} />
    <section className="closing-band"><div><p className="eyebrow">Bill Layne Insurance</p><h3>Questions about your home coverage?</h3><p>Our local team can help verify the details carriers use and explain what still needs to be confirmed.</p></div><div className="closing-actions"><a href={quoteHref}>Request an insurance review <ArrowRight size={18} /></a><a href="tel:3368351993"><Phone size={18} />Call 336-835-1993</a></div></section>
  </>;
}
