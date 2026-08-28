import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileSearch,
  FileText,
  Flame,
  FolderSearch,
  Home,
  LandPlot,
  LoaderCircle,
  Mail,
  Map,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Waves,
} from "lucide-react";
import type { ExternalLinks, PublicProperty, PublicPropertyResponse } from "../shared/property";
import { findCountyCoverage, findProperty } from "./lib/api";
import { LegalPage } from "./LegalPage";
import { ParcelMap } from "./ParcelMap";

type ResourceLink = {
  label: string;
  description: string;
  href?: string;
  icon: typeof MapPin;
  source: "Official" | "Third party" | "Agency resource";
};

const AGENCY_RESOURCES: ResourceLink[] = [
  {
    label: "Create a Home Inventory",
    description: "Photograph rooms and prepare a downloadable belongings inventory.",
    href: "https://billlayne.github.io/HOME-INVENTORY/",
    icon: Camera,
    source: "Agency resource",
  },
  {
    label: "Claims Inventory Worksheet",
    description: "Organize damaged or missing belongings after a covered loss.",
    href: "https://www.billlayneinsurance.com/claims-center/claims-inventory.html",
    icon: FileText,
    source: "Agency resource",
  },
  {
    label: "Send Documents Securely",
    description: "Send policy documents, photographs, inspections, or lender information.",
    href: "https://www.sendbilldocs.com/",
    icon: FolderSearch,
    source: "Agency resource",
  },
];

function formatNumber(value?: number) {
  return value == null ? "Not available" : new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value?: number) {
  return value == null
    ? "Not available"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function ResourceGroup({ id, title, eyebrow, links, tone }: { id: string; title: string; eyebrow: string; links: ResourceLink[]; tone: "photos" | "hazards" | "records" | "insurance" }) {
  const availableLinks = links.filter((link) => Boolean(link.href));
  return (
    <section id={id} className={`resource-section resource-section--${tone}`}>
      <div className="section-heading">
        <p>{eyebrow}</p>
        <h3>{title}</h3>
      </div>
      <div className="resource-grid">
        {availableLinks.map((link) => {
          const Icon = link.icon;
          return (
            <a key={`${title}-${link.label}`} className="resource-item" href={link.href} target="_blank" rel="noopener noreferrer">
              <span className="resource-icon"><Icon size={20} /></span>
              <span className="resource-copy">
                <strong>{link.label}</strong>
                <small>{link.description}</small>
                <em>{link.source}</em>
              </span>
              <span className="resource-arrow"><ExternalLink size={16} aria-hidden="true" /></span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function propertyResources(property: PublicProperty) {
  const links: ExternalLinks = property.links;
  return {
    photos: [
      { label: "Google Maps & Street View", description: "See the address, nearby roads, and available street-level imagery.", href: links.googleMaps, icon: MapPin, source: "Third party" as const },
      { label: "County GIS Aerial", description: "Open county parcel boundaries and available aerial photography.", href: links.gisParcel || links.gis, icon: Map, source: "Official" as const },
      { label: "Zillow Property Page", description: "See this home's photos, estimated value, and history — even if it is not for sale.", href: links.zillow, icon: Camera, source: "Third party" as const },
    ],
    hazards: [
      { label: "FEMA Flood Map", description: "Search the official FEMA Map Service Center using this address.", href: links.fema, icon: Waves, source: "Official" as const },
      { label: "NC Flood Risk Information System", description: "Explore state flood mapping and risk information.", href: links.ncFlood, icon: ShieldCheck, source: "Official" as const },
      { label: "ReadyNC Hazard Resources", description: "Review North Carolina emergency and hazard preparedness resources.", href: links.readyNc, icon: Flame, source: "Official" as const },
    ],
    records: [
      {
        label: property.hasCountyRecord ? "County GIS Parcel" : "County GIS Search",
        description: property.hasCountyRecord
          ? "Open the matched parcel in an official public mapping destination."
          : "Open the county's public mapping system and search the address.",
        href: links.gisParcel || links.gis,
        icon: LandPlot,
        source: "Official" as const,
      },
      { label: "County Property Card", description: "View the available county assessment or property record card.", href: links.taxCard, icon: FileSearch, source: "Official" as const },
      { label: "Deed or Register of Deeds", description: "Open the available county deed-search destination.", href: links.deed, icon: Building2, source: "Official" as const },
    ],
  };
}

/**
 * Where "Request an insurance review" goes.
 *
 * This was a mailto:, and a mailto: only does anything for a visitor whose
 * browser has a desktop mail client registered as the handler. Someone reading
 * Gmail in a tab -- most of this tool's traffic -- clicked the button and
 * NOTHING happened at all: no error, no tab, no compose window. The link was
 * well formed the whole time, which is why it looks fine when tested on a
 * phone, where the Mail app picks it up.
 *
 * It now points at the agency's own home quote form, which is an ordinary
 * https page that works everywhere and feeds the lead path Bill already
 * watches, rather than depending on software the visitor may not have.
 *
 * The address and ZIP ride along so the form arrives partly filled: the
 * customer came here having already typed their address once, and asking for
 * it a second time is how a lead gets abandoned.
 */
// The canonical form: /home-quote.html 308-redirects here, and linking at
// the .html would spend a round trip to learn that.
const QUOTE_FORM_URL = "https://www.billlayneinsurance.com/home-quote";

/** The 5-digit ZIP out of a county-formatted address, when there is one. */
const zipFrom = (address: string): string => /\b(\d{5})(?:-\d{4})?\s*$/.exec(address.trim())?.[1] ?? "";

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/privacy") return <LegalPage kind="privacy" />;
  if (path === "/terms") return <LegalPage kind="terms" />;

  const [address, setAddress] = useState("");
  const [response, setResponse] = useState<PublicPropertyResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coverageCount, setCoverageCount] = useState(53);
  const [isRebuildExpanded, setIsRebuildExpanded] = useState(false);
  const [reportStatus, setReportStatus] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeProperty = response?.results[selectedIndex] || null;
  const resources = useMemo(() => activeProperty ? propertyResources(activeProperty) : null, [activeProperty]);
  const homeLinks = useMemo(() => {
    if (!activeProperty) return [];
    const links = activeProperty.links;
    return [
      {
        label: activeProperty.hasCountyRecord ? "Official parcel map" : "County GIS search",
        description: activeProperty.hasCountyRecord ? "Open the matched parcel in the county mapping system." : "Search this address in the county mapping system.",
        href: links.gisParcel || links.gis,
        icon: LandPlot,
      },
      {
        label: "County property card",
        description: "Open the available assessment and building record.",
        href: links.taxCard,
        icon: FileSearch,
      },
      {
        label: "Maps & Street View",
        description: "See the address, surrounding roads, and street-level imagery.",
        href: links.googleMaps,
        icon: MapPin,
      },
      {
        label: "FEMA flood map",
        description: "Review the official FEMA map search for this address.",
        href: links.fema,
        icon: Waves,
      },
    ].filter((link): link is { label: string; description: string; href: string; icon: typeof MapPin } => Boolean(link.href));
  }, [activeProperty]);
  const factItems = activeProperty ? [
    { label: "Heated area", value: activeProperty.heatedArea ? `${formatNumber(activeProperty.heatedArea)} sq ft` : undefined },
    { label: "Year built", value: activeProperty.yearBuilt ? String(activeProperty.yearBuilt) : undefined },
    { label: "Acreage", value: activeProperty.totalAcres == null ? undefined : formatNumber(activeProperty.totalAcres) },
    { label: "Assessed value", value: activeProperty.totalValue == null ? undefined : formatCurrency(activeProperty.totalValue) },
    { label: "Bedrooms", value: activeProperty.bedrooms == null ? undefined : String(activeProperty.bedrooms) },
    {
      label: "Bathrooms",
      value: activeProperty.fullBaths == null
        ? undefined
        : `${activeProperty.fullBaths} full${activeProperty.halfBaths ? `, ${activeProperty.halfBaths} half` : ""}`,
    },
    { label: "Exterior", value: activeProperty.exteriorWall },
    { label: "Roof", value: activeProperty.roofCover || activeProperty.roofStructure },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value)) : [];

  async function runSearch(cleanAddress: string) {
    setLoading(true);
    setError("");
    try {
      const result = await findProperty(cleanAddress);
      setResponse(result);
      setSelectedIndex(0);
      if (!result.results.length) setError("We could not find an automatic county record for that address yet.");
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (lookupError) {
      setResponse(null);
      setError(lookupError instanceof Error ? lookupError.message : "Property lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cleanAddress = address.replace(/\s+/g, " ").trim();
    if (!cleanAddress) return;
    await runSearch(cleanAddress);
  }

  // Deep link: /?address=123 Main St, Elkin NC prefills the box and runs the
  // lookup immediately — lets other tools (e.g. the task manager) jump straight
  // to a property with one tap. Runs once on mount.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("address");
    const clean = (fromUrl || "").replace(/\s+/g, " ").trim();
    if (!clean) return;
    setAddress(clean);
    void runSearch(clean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    findCountyCoverage()
      .then((count) => {
        if (!cancelled && count > 0) setCoverageCount(count);
      })
      .catch(() => {
        // The verified fallback keeps the page useful if the coverage endpoint is temporarily unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIsRebuildExpanded(false);
    setReportStatus("");
  }, [activeProperty?.id]);

  function focusSearch() {
    document.getElementById("property-search")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => searchInputRef.current?.focus(), 450);
  }

  function handlePrintReport() {
    window.print();
  }

  async function handleShareReport() {
    if (!activeProperty) return;
    const shareUrl = new URL(window.location.href);
    shareUrl.search = "";
    shareUrl.searchParams.set("address", activeProperty.searchedAddress);
    const shareData = {
      title: `Home information for ${activeProperty.officialAddress}`,
      text: `Public property information and official links for ${activeProperty.officialAddress}.`,
      url: shareUrl.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setReportStatus("Property report shared.");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setReportStatus("Property report link copied.");
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") return;
      setReportStatus("The link could not be shared. You can copy the address from the search box.");
    }
  }

  const quoteHref = (() => {
    const url = new URL(QUOTE_FORM_URL);
    if (activeProperty) {
      const address = activeProperty.searchedAddress || "";
      if (address) url.searchParams.set("address", address);
      const zip = zipFrom(address);
      if (zip) url.searchParams.set("zip", zip);
      if (activeProperty.county) url.searchParams.set("county", activeProperty.county);
    }
    return url.toString();
  })();

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="https://www.billlayneinsurance.com/" aria-label="Bill Layne Insurance home">
          <span className="brand-mark"><Home size={20} /></span>
          <span><strong>Bill Layne Insurance</strong><small>Find My Home Information</small></span>
        </a>
        <div className="header-actions">
          <a href="tel:3368351993"><Phone size={16} />336-835-1993</a>
          <a href="mailto:save@billlayneinsurance.com"><Mail size={16} />Email Agency</a>
        </div>
      </header>

      <main>
        <section className="search-hero">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-overlay" />
          <div className="hero-content">
            <p className="hero-kicker"><MapPin size={15} />Free North Carolina property resource</p>
            <h1>Find Your North Carolina <span>Home Information</span></h1>
            <p className="hero-lead">Enter an address to find available property records, maps, aerial photos, flood resources, and county links in one place.</p>
            <form id="property-search" className="search-form" onSubmit={handleSubmit}>
              <label className="search-input-wrap">
                <Search size={20} aria-hidden="true" />
                <span className="sr-only">North Carolina property address</span>
                <input
                  ref={searchInputRef}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Example: 123 Main St, Elkin, NC"
                  autoComplete="street-address"
                />
              </label>
              <button type="submit" disabled={loading}>
                {loading ? <LoaderCircle className="spin" size={19} /> : <Search size={19} />}
                {loading ? "Finding records" : "Find my home"}
              </button>
            </form>
            <div className="trust-row">
              <span><CheckCircle2 size={15} />No account required</span>
              <span><CheckCircle2 size={15} />Official source links</span>
              <span><CheckCircle2 size={15} />No address history saved</span>
            </div>
          </div>
        </section>

        <section className="scope-band">
          <div><span className="scope-icon"><Map size={19} /></span><span className="scope-copy"><strong>{coverageCount} integrated counties</strong><span>Automatic parcel details where supported</span></span></div>
          <div><span className="scope-icon"><ShieldCheck size={19} /></span><span className="scope-copy"><strong>Statewide hazard tools</strong><span>FEMA and North Carolina resources</span></span></div>
          <div><span className="scope-icon"><CheckCircle2 size={19} /></span><span className="scope-copy"><strong>Public information only</strong><span>No agency notes or customer files</span></span></div>
        </section>

        {error ? (
          <div className="notice error-notice" role="alert">
            <AlertTriangle size={21} />
            <div><strong>We could not complete that lookup.</strong><span>{error}</span></div>
          </div>
        ) : null}

        {activeProperty && resources ? (
          <div className="results" ref={resultsRef}>
            <nav className="result-nav" aria-label="Property report sections">
              <div className="result-nav-links">
                <a href="#property-overview">Overview</a>
                <a href="#home-links">Home links</a>
                {activeProperty.parcelRings?.length ? <a href="#parcel-map">Parcel map</a> : null}
                <a href="#photos-maps">Photos</a>
                <a href="#hazards">Hazards</a>
                <a href="#records">Records</a>
              </div>
              <button type="button" onClick={focusSearch}><RotateCcw size={14} />New address</button>
            </nav>

            {response && response.results.length > 1 ? (
              <div className="result-picker" aria-label="Choose a property match">
                {response.results.map((property, index) => (
                  <button key={property.id} type="button" className={index === selectedIndex ? "active" : ""} onClick={() => setSelectedIndex(index)}>
                    {property.officialAddress}
                  </button>
                ))}
              </div>
            ) : null}

            <section id="property-overview" className="property-summary">
              <div className="summary-heading">
                <div>
                  <p className="eyebrow">Available public information</p>
                  <h2>{activeProperty.officialAddress}</h2>
                  <div className="badges">
                    <span>{activeProperty.county} County</span>
                    {activeProperty.parcelId || activeProperty.pin ? <span>Parcel {activeProperty.parcelId || activeProperty.pin}</span> : null}
                    <span className={activeProperty.hasCountyRecord ? "verified-badge" : "limited-badge"}>
                      {activeProperty.matchMethod === "parcel-point"
                        ? "Parcel verified by location"
                        : activeProperty.hasCountyRecord
                          ? "County record matched"
                          : "Address located"}
                    </span>
                  </div>
                </div>
                <div className="summary-actions">
                  <a className="primary-cta" href={quoteHref}>Request an insurance review <ArrowRight size={17} /></a>
                  <a className="secondary-cta" href="tel:3368351993"><Phone size={16} />Call the agency</a>
                  <div className="report-actions" aria-label="Property report actions">
                    <button type="button" onClick={handlePrintReport}><Printer size={15} />Print / Save PDF</button>
                    <button type="button" onClick={() => void handleShareReport()}><Share2 size={15} />Share report</button>
                  </div>
                  <span className="report-status" role="status" aria-live="polite">{reportStatus}</span>
                </div>
              </div>

              {activeProperty.recordAddressDiffers ? (
                <div className="notice address-notice">
                  <MapPin size={20} />
                  <div><strong>The county record uses a different property address.</strong><span>You searched {activeProperty.searchedAddress}. The information below is the parcel found at that location.</span></div>
                </div>
              ) : null}

              {!activeProperty.hasCountyRecord ? (
                <div className="notice limited-record-notice">
                  <AlertTriangle size={20} />
                  <div>
                    <strong>The address was located, but an automatic parcel record was not returned.</strong>
                    <span>{response?.note || "Use the verified county and statewide resources below while we monitor this county connection."}</span>
                  </div>
                </div>
              ) : factItems.length ? (
                <>
                  <div className={`fact-grid fact-grid--${Math.min(factItems.length, 4)}`}>
                    {factItems.map((item) => (
                      <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
                    ))}
                  </div>
                  {factItems.length < 8 ? (
                    <p className="fact-source-note">Only facts published by the connected county source are shown. Additional building details may require the official property card.</p>
                  ) : null}
                </>
              ) : (
                <div className="notice limited-record-notice">
                  <FileSearch size={20} />
                  <div>
                    <strong>The parcel was matched, but this county publishes limited building details.</strong>
                    <span>Use the official property-card link below for the most complete available record.</span>
                  </div>
                </div>
              )}
            </section>

            {homeLinks.length ? (
              <section id="home-links" className="home-links-section">
                <div className="home-links-heading">
                  <div className="section-heading">
                    <p>Your home links</p>
                    <h3>Open the most useful property resources</h3>
                  </div>
                  <span>Official destinations open in a new tab</span>
                </div>
                <div className="home-links-grid">
                  {homeLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                        <span className="home-link-icon"><Icon size={20} /></span>
                        <span><strong>{link.label}</strong><small>{link.description}</small></span>
                        <ExternalLink size={15} aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {activeProperty.totalValue != null ? (
              <section className="rebuild-explainer">
                <div className="rebuild-summary">
                  <div className="section-heading">
                    <p>What this means for insurance</p>
                    <h3>Tax value is not the same as rebuild cost</h3>
                  </div>
                  <button type="button" onClick={() => setIsRebuildExpanded((current) => !current)} aria-expanded={isRebuildExpanded} aria-controls="rebuild-details">
                    {isRebuildExpanded ? "Show less" : "Learn why"}
                    {isRebuildExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                <p className="section-intro">
                  The assessed value above is what the county uses to work out property taxes. Home insurance is
                  based on something different: what it would cost to rebuild this home today.
                </p>
                <div id="rebuild-details" className={`rebuild-details${isRebuildExpanded ? " is-open" : ""}`} aria-hidden={!isRebuildExpanded}>
                  <div className="rebuild-grid">
                    <div>
                      <span className="rebuild-tag rebuild-tag--tax">Tax value</span>
                      <strong>What the county taxes</strong>
                      <p>Set by the county to bill property taxes. It includes the land, and it often comes from a revaluation done a few years ago.</p>
                    </div>
                    <div>
                      <span className="rebuild-tag rebuild-tag--rebuild">Rebuild cost</span>
                      <strong>What it costs to build again</strong>
                      <p>Today&rsquo;s price of the materials and labor to rebuild the same home after a total loss. The land is not included, because you would still own it.</p>
                    </div>
                    <div>
                      <span className="rebuild-tag rebuild-tag--why">Why they differ</span>
                      <strong>Two different jobs</strong>
                      <p>Building costs move with the market, and older homes can cost more to rebuild than their tax value suggests. The two numbers are commonly far apart.</p>
                    </div>
                  </div>
                  <p className="rebuild-note">
                    This is why a homeowners policy amount is often higher than a tax value. Insuring a home for its
                    tax value can leave a gap after a serious loss, so it is worth confirming the rebuild figure
                    rather than assuming the two match.
                  </p>
                </div>
              </section>
            ) : null}

            <ParcelMap property={activeProperty} />
            <ResourceGroup id="photos-maps" title="See the home and surrounding property" eyebrow="Photos and maps" links={resources.photos} tone="photos" />
            <ResourceGroup id="hazards" title="Review location-based hazard information" eyebrow="Hazard resources" links={resources.hazards} tone="hazards" />
            <ResourceGroup id="records" title="Open available county records" eyebrow="Official records" links={resources.records} tone="records" />
            <ResourceGroup id="insurance-resources" title="Prepare before and after a home insurance claim" eyebrow="Insurance resources" links={AGENCY_RESOURCES} tone="insurance" />

            <section className="closing-band">
              <div>
                <p className="eyebrow">Local help when you need it</p>
                <h3>Questions about what these records mean for home insurance?</h3>
                <p>Bill Layne Insurance can help verify the property details carriers use and explain what still needs to be confirmed.</p>
              </div>
              <div className="closing-actions">
                <a href={quoteHref}>Email this property <Mail size={17} /></a>
                <a href="tel:3368351993">Call 336-835-1993 <Phone size={17} /></a>
              </div>
            </section>
          </div>
        ) : (
          <section className="pre-search">
            <div className="pre-search-heading">
              <div className="section-heading"><p>What you can find</p><h2>One address. The useful property resources, organized.</h2></div>
              <p className="section-intro">Start with the address above. We will connect you to the public information available for that property and county.</p>
            </div>
            <div className="pre-search-grid">
              <div className="feature-card">
                <img src="/assets/property-photos-maps.webp" alt="Aerial view of a North Carolina home and parcel boundary" width="1200" height="900" loading="lazy" />
                <div className="feature-card-body"><span className="feature-icon"><Camera size={23} /></span><strong>Photos and aerial maps</strong><span>Street View, county GIS imagery, and available listing searches.</span></div>
              </div>
              <div className="feature-card">
                <img src="/assets/property-hazard-resources.webp" alt="Tablet displaying property flood and terrain information" width="1200" height="800" loading="lazy" />
                <div className="feature-card-body"><span className="feature-icon"><Waves size={23} /></span><strong>Flood and hazard tools</strong><span>Official FEMA and North Carolina risk resources.</span></div>
              </div>
              <div className="feature-card">
                <img src="/assets/property-county-records.webp" alt="Organized property assessment, deed, and parcel records" width="1200" height="800" loading="lazy" />
                <div className="feature-card-body"><span className="feature-icon"><FileSearch size={23} /></span><strong>County public records</strong><span>Available parcel maps, property cards, assessments, and deeds.</span></div>
              </div>
              <div className="feature-card">
                <img src="/assets/property-home-inventory.webp" alt="Homeowner photographing a living room for a home inventory" width="1200" height="800" loading="lazy" />
                <div className="feature-card-body"><span className="feature-icon"><FileText size={23} /></span><strong>Home inventory resources</strong><span>Prepare belongings records before a loss and organize claim information afterward.</span></div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <strong>Bill Layne Insurance Agency</strong>
        <span>1283 N Bridge St, Elkin, NC 28621</span>
        <nav className="footer-links" aria-label="Legal information">
          <a href="/privacy">Privacy Notice</a>
          <a href="/terms">Terms of Use</a>
          <a href="https://www.billlayneinsurance.com/">Agency Website</a>
        </nav>
        <span>Public records can be incomplete or outdated. This tool is not a title search, survey, flood determination, appraisal, or guarantee of insurance eligibility.</span>
      </footer>

      <nav className="mobile-dock" aria-label="Quick actions">
        <a href="tel:3368351993"><Phone size={18} />Call</a>
        <a href="#property-search"><Search size={18} />Find a home</a>
      </nav>
    </div>
  );
}
