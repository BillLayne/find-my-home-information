import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  FileText,
  Flame,
  FolderSearch,
  Home,
  HousePlug,
  LandPlot,
  LoaderCircle,
  Mail,
  Map,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Waves,
} from "lucide-react";
import type { ExternalLinks, PublicProperty, PublicPropertyResponse } from "../shared/property";
import { findProperty } from "./lib/api";

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

function ResourceGroup({ title, eyebrow, links }: { title: string; eyebrow: string; links: ResourceLink[] }) {
  const availableLinks = links.filter((link) => Boolean(link.href));
  return (
    <section className="resource-section">
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
              <ExternalLink size={17} aria-hidden="true" />
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
      { label: "Zillow Property Search", description: "Search for available listing photographs and market information.", href: links.zillow, icon: Camera, source: "Third party" as const },
      { label: "Realtor.com Property Search", description: "Search for listing history and available property photographs.", href: links.realtor, icon: HousePlug, source: "Third party" as const },
    ],
    hazards: [
      { label: "FEMA Flood Map", description: "Search the official FEMA Map Service Center using this address.", href: links.fema, icon: Waves, source: "Official" as const },
      { label: "NC Flood Risk Information System", description: "Explore state flood mapping and risk information.", href: links.ncFlood, icon: ShieldCheck, source: "Official" as const },
      { label: "ReadyNC Hazard Resources", description: "Review North Carolina emergency and hazard preparedness resources.", href: links.readyNc, icon: Flame, source: "Official" as const },
    ],
    records: [
      { label: "County GIS Parcel", description: "Open the county's official public parcel mapping system.", href: links.gisParcel || links.gis, icon: LandPlot, source: "Official" as const },
      { label: "County Property Card", description: "View the available county assessment or property record card.", href: links.taxCard, icon: FileSearch, source: "Official" as const },
      { label: "Deed or Register of Deeds", description: "Open the available county deed-search destination.", href: links.deed, icon: Building2, source: "Official" as const },
    ],
  };
}

export function App() {
  const [address, setAddress] = useState("");
  const [response, setResponse] = useState<PublicPropertyResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);

  const activeProperty = response?.results[selectedIndex] || null;
  const resources = useMemo(() => activeProperty ? propertyResources(activeProperty) : null, [activeProperty]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cleanAddress = address.replace(/\s+/g, " ").trim();
    if (!cleanAddress) return;
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

  const quoteHref = activeProperty
    ? `mailto:save@billlayneinsurance.com?subject=${encodeURIComponent(`Home insurance review - ${activeProperty.searchedAddress}`)}&body=${encodeURIComponent(`Hello Bill Layne Insurance,\n\nI used the Find My Home Information tool and would like help reviewing insurance for:\n\n${activeProperty.searchedAddress}\n${activeProperty.county} County\nParcel: ${activeProperty.parcelId || activeProperty.pin || "Not available"}\n\nPlease contact me to continue.`)}`
    : "mailto:save@billlayneinsurance.com?subject=Home%20insurance%20review";

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="https://www.billlayneinsurance.com/" aria-label="Bill Layne Insurance home">
          <span className="brand-mark"><Home size={20} /></span>
          <span><strong>Bill Layne Insurance</strong><small>North Carolina property resource</small></span>
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
            <p className="eyebrow">Free North Carolina property resource</p>
            <h1>Find Your North Carolina Home Information</h1>
            <p className="hero-lead">Enter an address to find available property records, maps, aerial photos, flood resources, and county links in one place.</p>
            <form className="search-form" onSubmit={handleSubmit}>
              <label className="search-input-wrap">
                <Search size={20} aria-hidden="true" />
                <span className="sr-only">North Carolina property address</span>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Enter a street address, city, and NC"
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
          <div><strong>26 integrated counties</strong><span>Automatic parcel details where supported</span></div>
          <div><strong>Statewide hazard tools</strong><span>FEMA and North Carolina resources</span></div>
          <div><strong>Public information only</strong><span>No agency notes or customer files</span></div>
        </section>

        {error ? (
          <div className="notice error-notice" role="alert">
            <AlertTriangle size={21} />
            <div><strong>We could not complete that lookup.</strong><span>{error}</span></div>
          </div>
        ) : null}

        {activeProperty && resources ? (
          <div className="results" ref={resultsRef}>
            {response && response.results.length > 1 ? (
              <div className="result-picker" aria-label="Choose a property match">
                {response.results.map((property, index) => (
                  <button key={property.id} type="button" className={index === selectedIndex ? "active" : ""} onClick={() => setSelectedIndex(index)}>
                    {property.officialAddress}
                  </button>
                ))}
              </div>
            ) : null}

            <section className="property-summary">
              <div className="summary-heading">
                <div>
                  <p className="eyebrow">Available public information</p>
                  <h2>{activeProperty.officialAddress}</h2>
                  <div className="badges">
                    <span>{activeProperty.county} County</span>
                    {activeProperty.parcelId || activeProperty.pin ? <span>Parcel {activeProperty.parcelId || activeProperty.pin}</span> : null}
                  </div>
                </div>
                <a className="primary-cta" href={quoteHref}>Request an insurance review <ArrowRight size={17} /></a>
              </div>

              {activeProperty.recordAddressDiffers ? (
                <div className="notice address-notice">
                  <MapPin size={20} />
                  <div><strong>The county record uses a different property address.</strong><span>You searched {activeProperty.searchedAddress}. The information below is the parcel found at that location.</span></div>
                </div>
              ) : null}

              <div className="fact-grid">
                <div><span>Heated area</span><strong>{activeProperty.heatedArea ? `${formatNumber(activeProperty.heatedArea)} sq ft` : "Not available"}</strong></div>
                <div><span>Year built</span><strong>{activeProperty.yearBuilt || "Not available"}</strong></div>
                <div><span>Acreage</span><strong>{activeProperty.totalAcres == null ? "Not available" : formatNumber(activeProperty.totalAcres)}</strong></div>
                <div><span>Assessed value</span><strong>{formatCurrency(activeProperty.totalValue)}</strong></div>
                <div><span>Bedrooms</span><strong>{activeProperty.bedrooms ?? "Not available"}</strong></div>
                <div><span>Bathrooms</span><strong>{activeProperty.fullBaths == null ? "Not available" : `${activeProperty.fullBaths} full${activeProperty.halfBaths ? `, ${activeProperty.halfBaths} half` : ""}`}</strong></div>
                <div><span>Exterior</span><strong>{activeProperty.exteriorWall || "Not available"}</strong></div>
                <div><span>Roof</span><strong>{activeProperty.roofCover || activeProperty.roofStructure || "Not available"}</strong></div>
              </div>
            </section>

            <ResourceGroup title="See the home and surrounding property" eyebrow="Photos and maps" links={resources.photos} />
            <ResourceGroup title="Review location-based hazard information" eyebrow="Hazard resources" links={resources.hazards} />
            <ResourceGroup title="Open available county records" eyebrow="Official records" links={resources.records} />
            <ResourceGroup title="Prepare before and after a home insurance claim" eyebrow="Insurance resources" links={AGENCY_RESOURCES} />

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
            <div className="section-heading"><p>What you can find</p><h2>One search, organized destinations</h2></div>
            <div className="pre-search-grid">
              <div><Camera size={23} /><strong>Photos and aerial maps</strong><span>Street View, county GIS imagery, and available listing searches.</span></div>
              <div><Waves size={23} /><strong>Flood and hazard tools</strong><span>Official FEMA and North Carolina risk resources.</span></div>
              <div><FileSearch size={23} /><strong>County public records</strong><span>Available parcel maps, property cards, assessments, and deeds.</span></div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <strong>Bill Layne Insurance Agency</strong>
        <span>1283 N Bridge St, Elkin, NC 28621</span>
        <span>Public records can be incomplete or outdated. This tool is not a title search, survey, flood determination, appraisal, or guarantee of insurance eligibility.</span>
      </footer>
    </div>
  );
}
