import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import {
  ArrowRight,
  ChevronRight,
  Droplets,
  ExternalLink,
  FileText,
  Home,
  LoaderCircle,
  Mail,
  Map,
  MapPin,
  PackageCheck,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { PublicPropertyResponse } from "../shared/property";
import { findCountyCoverage, findProperty } from "./lib/api";
import { validateAddress } from "./lib/report";
import { LegalPage } from "./LegalPage";
import { PropertyReport } from "./PropertyReport";

const IMG_AGENCY_LOGO = "/agency-logo.png";
const IMG_DESKTOP_HERO = "https://img.billlayneinsurance.com/i/2026/10/desktop-hero-ujbrhm.webp";
const IMG_MOBILE_HERO = "https://img.billlayneinsurance.com/i/2026/10/mobile-hero-4tkayf.webp";
const IMG_PROPERTY_PREVIEW = "https://img.billlayneinsurance.com/i/2026/10/property-preview-p68nus.webp";
const IMG_AERIAL_MAP = "https://img.billlayneinsurance.com/i/2026/10/aerial-map-j7tf9j.webp";
const IMG_FLOOD_RESOURCES = "https://img.billlayneinsurance.com/i/2026/10/flood-resources-zzdcxg.webp";
const IMG_HOME_INVENTORY = "https://img.billlayneinsurance.com/i/2026/10/home-inventory-q8z447.webp";
const IMG_MOUNTAIN_CONTACT = "https://img.billlayneinsurance.com/i/2026/09/bill-layne-agency-hero-background-xh5eb5.webp";

const SAMPLE_DEMO_ADDRESS = "1283 N Bridge St, Elkin, NC 28621";

type ResourceCardItem = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  icon: typeof FileText;
  href?: string;
  action: "focus-search" | "external";
};

const RESOURCE_CARDS: ResourceCardItem[] = [
  {
    title: "Property Records",
    description: "Find available property details from your county.",
    image: IMG_PROPERTY_PREVIEW,
    imageAlt: "North Carolina craftsman home exterior",
    icon: FileText,
    action: "focus-search",
  },
  {
    title: "Maps & Aerial Views",
    description: "Explore your property and surrounding area.",
    image: IMG_AERIAL_MAP,
    imageAlt: "Aerial view of a residential neighborhood",
    icon: Map,
    action: "focus-search",
  },
  {
    title: "Flood Resources",
    description: "Access flood maps and related resources.",
    image: IMG_FLOOD_RESOURCES,
    imageAlt: "Decorative illustration of a river flood zone map",
    icon: Droplets,
    href: "https://fris.nc.gov/fris/",
    action: "external",
  },
  {
    title: "Home Inventory",
    description: "Find tools to document your belongings.",
    image: IMG_HOME_INVENTORY,
    imageAlt: "Organized living room interior for home inventory planning",
    icon: Home,
    href: "https://billlayne.github.io/HOME-INVENTORY/",
    action: "external",
  },
];

const PREVIEW_STEPS = [
  {
    num: "1",
    title: "Enter your address",
    text: "Start with your North Carolina property.",
  },
  {
    num: "2",
    title: "Explore available resources",
    text: "Review available records, maps, and links.",
  },
  {
    num: "3",
    title: "Keep useful details",
    text: "Note information for future reference.",
  },
];

const GUIDANCE_CARDS = [
  {
    icon: Home,
    title: "Check your home’s details",
    text: "Review available records and flag information that needs confirmation.",
  },
  {
    icon: Map,
    title: "Explore your surroundings",
    text: "Use maps and aerial views to understand the area.",
  },
  {
    icon: PackageCheck,
    title: "Document your belongings",
    text: "Keep a home inventory with photos and useful details.",
  },
];

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
}

function AddressSearch({
  id,
  address,
  onChange,
  onSubmit,
  loading,
  error,
  inputRef,
  onCancel,
  showPublicNote = false,
  highlighted = false,
}: {
  id: string;
  address: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  loading: boolean;
  error: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onCancel?: () => void;
  showPublicNote?: boolean;
  highlighted?: boolean;
}) {
  return (
    <form
      id={id}
      className={`search-form${highlighted ? " is-highlighted" : ""}`}
      onSubmit={onSubmit}
      noValidate
    >
      <label className="search-label" htmlFor={`${id}-address`}>
        Enter your North Carolina address
      </label>
      <div className="search-fields">
        <div className="search-input-wrap">
          <MapPin size={20} strokeWidth={1.75} aria-hidden="true" />
          <input
            id={`${id}-address`}
            ref={inputRef}
            value={address}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Street address, city, ZIP code"
            autoComplete="street-address"
            type="search"
            readOnly={loading}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? (
            <LoaderCircle className="spin" size={19} aria-hidden="true" />
          ) : (
            <Search size={19} strokeWidth={2} aria-hidden="true" />
          )}
          {loading ? "Finding records..." : "Find My Home"}
        </button>
      </div>
      <p id={`${id}-hint`} className="search-hint">
        Available details vary by county.
      </p>
      {error && (
        <p id={`${id}-error`} className="search-error" role="alert">
          {error}
        </p>
      )}
      <div className="search-feedback">
        <span role="status">{loading ? "Searching public property records..." : ""}</span>
        {onCancel && (
          <button className="text-button" type="button" onClick={onCancel}>
            {loading ? "Cancel lookup" : "Cancel"}
          </button>
        )}
      </div>
      {showPublicNote && (
        <div className="search-public-note">
          Public property information &bull; No account required
        </div>
      )}
    </form>
  );
}

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/privacy") return <LegalPage kind="privacy" />;
  if (path === "/terms") return <LegalPage kind="terms" />;
  return <HomeSearchPage />;
}

function HomeSearchPage() {
  const [address, setAddress] = useState("");
  const [response, setResponse] = useState<PublicPropertyResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coverageCount, setCoverageCount] = useState(53);
  const [editing, setEditing] = useState(false);
  const [heroTab, setHeroTab] = useState<"records" | "maps" | "resources">("records");
  const [previewTab, setPreviewTab] = useState<"records" | "maps" | "resources">("records");
  const [searchHighlight, setSearchHighlight] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorInputRef = useRef<HTMLInputElement>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const activeProperty = response?.results[selectedIndex] || null;

  async function runSearch(value: string, preferredParcel?: string) {
    if (pendingRequest.current) return;
    const clean = value.replace(/\s+/g, " ").trim();
    const validationError = validateAddress(clean);
    if (validationError) {
      setError(validationError);
      (activeProperty ? editorInputRef : searchInputRef).current?.focus();
      return;
    }
    const controller = new AbortController();
    pendingRequest.current = controller;
    setLoading(true);
    setError("");
    try {
      const result = await findProperty(clean, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.results.length) {
        setError("No property was returned. Check the street address, city, and ZIP code, then try again.");
        return;
      }
      setResponse(result);
      const preferredIndex = preferredParcel
        ? result.results.findIndex(
            (property) => property.parcelId === preferredParcel || property.pin === preferredParcel
          )
        : 0;
      setSelectedIndex(Math.max(0, preferredIndex));
      setEditing(false);
      // Consume an incoming share link without keeping the address in browser history.
      window.history.replaceState(null, "", window.location.pathname);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
        resultsRef.current?.focus({ preventScroll: true });
      });
    } catch (lookupError) {
      if (!controller.signal.aborted) {
        setError(
          lookupError instanceof Error ? lookupError.message : "Property lookup failed. Please try again."
        );
      }
    } finally {
      if (pendingRequest.current === controller) {
        pendingRequest.current = null;
        setLoading(false);
      }
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void runSearch(address);
  }

  function focusSearchInput() {
    const clean = address.replace(/\s+/g, " ").trim();
    if (clean && !validateAddress(clean)) {
      void runSearch(clean);
      return;
    }
    const formEl = document.getElementById("property-search");
    if (formEl) {
      formEl.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
    }
    setSearchHighlight(true);
    window.setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    }, 320);
    window.setTimeout(() => {
      setSearchHighlight(false);
    }, 1800);
  }

  function runSampleLookup() {
    setAddress(SAMPLE_DEMO_ADDRESS);
    void runSearch(SAMPLE_DEMO_ADDRESS);
  }

  function changeAddress() {
    if (editing) {
      editorInputRef.current?.focus();
      return;
    }
    if (activeProperty) {
      setAddress(activeProperty.searchedAddress);
      setError("");
      setEditing(true);
    } else {
      focusSearchInput();
    }
  }

  function cancelEdit() {
    pendingRequest.current?.abort();
    pendingRequest.current = null;
    setLoading(false);
    setEditing(false);
    setError("");
    setAddress(activeProperty?.searchedAddress || "");
    requestAnimationFrame(() => document.getElementById("change-address")?.focus());
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("address")?.trim();
    if (fromUrl) {
      setAddress(fromUrl);
      void runSearch(fromUrl, params.get("parcel") || undefined);
    }
    return () => {
      pendingRequest.current?.abort();
      pendingRequest.current = null;
    };
    // An incoming share link is consumed once, not on subsequent form edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    findCountyCoverage()
      .then((count) => {
        if (!cancelled) setCoverageCount(count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editing) return;
    editorInputRef.current?.focus({ preventScroll: true });
    document.getElementById("report-search")?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
  }, [editing]);

  const quoteUrl = new URL("https://www.billlayneinsurance.com/home-quote");
  if (activeProperty) {
    quoteUrl.searchParams.set("address", activeProperty.searchedAddress);
    const zip = /\b(\d{5})(?:-\d{4})?\s*$/.exec(activeProperty.searchedAddress)?.[1];
    if (zip) quoteUrl.searchParams.set("zip", zip);
    if (activeProperty.county) quoteUrl.searchParams.set("county", activeProperty.county);
  }

  const faqs = [
    {
      question: "What if my county is not available?",
      answer: `Automatic county parcel details are currently integrated for ${coverageCount} North Carolina counties. If your county does not return automatic building facts, you will still receive links to available county lookup portals, statewide GIS maps, and flood resources for your address.`,
    },
    {
      question: "How current are property records?",
      answer:
        "Property information comes from public county tax assessment and GIS records. Counties update their records on different schedules, so public records can be incomplete or outdated. Always verify important details with the official county source.",
    },
    {
      question: "Is this an official flood determination?",
      answer:
        "No. The flood map links connect you to FEMA and the North Carolina Flood Risk Information System for general educational reference. They do not replace an official flood zone determination, elevation certificate, or property survey.",
    },
    {
      question: "Does this provide an insurance quote?",
      answer:
        "No. Find My Home is a free public property lookup resource and does not generate an insurance quote or guarantee coverage eligibility. Insurance quotes require a separate review with our licensed agency team.",
    },
  ];

  return (
    <div className={`app-shell${activeProperty ? " report-page" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to {activeProperty ? "property report" : "property search"}
      </a>

      {/* 3. HEADER */}
      <header className="site-header">
        <div className="site-header-inner">
          <a
            className="brand"
            href="https://www.billlayneinsurance.com/"
            aria-label="Bill Layne Insurance home"
          >
            <img
              className="brand-logo-img"
              src={IMG_AGENCY_LOGO}
              alt="Bill Layne Insurance Agency"
              width={164}
              height={50}
              fetchPriority="high"
            />
            <span className="brand-divider" aria-hidden="true" />
            <span className="brand-sub">Find My Home</span>
          </a>

          <div className="header-actions">
            {activeProperty && <span className="header-tag">Free property report</span>}
            <a
              className="header-phone"
              href="tel:3368351993"
              aria-label="Call Bill Layne Insurance at 336-835-1993"
            >
              <Phone size={16} strokeWidth={2} aria-hidden="true" />
              <span>336-835-1993</span>
            </a>
            <a
              className="header-contact-btn"
              href={activeProperty ? "mailto:Save@BillLayneInsurance.com" : "#contact-panel"}
            >
              Contact Us
            </a>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {!activeProperty && (
          <>
            {/* 4. HERO AND ADDRESS SEARCH */}
            <section className="search-hero">
              <picture className="hero-picture" aria-hidden="true">
                <source media="(max-width: 767px)" srcSet={IMG_MOBILE_HERO} />
                <img
                  className="hero-bg-img"
                  src={IMG_DESKTOP_HERO}
                  alt=""
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
              <div className="hero-overlay" aria-hidden="true" />

              <div className="hero-container">
                <div className="hero-left">
                  <p className="hero-kicker">NORTH CAROLINA PROPERTY RESOURCES</p>
                  <h1>
                    Your home. <span>A clearer picture.</span>
                  </h1>
                  <p className="hero-lead">
                    Explore available property records, photos, maps, and flood resources—all from your
                    address.
                  </p>
                  <AddressSearch
                    id="property-search"
                    address={address}
                    onChange={setAddress}
                    onSubmit={handleSubmit}
                    loading={loading}
                    error={error}
                    inputRef={searchInputRef}
                    showPublicNote
                    highlighted={searchHighlight}
                  />
                </div>

                <aside className="hero-preview-card" aria-label="Example property preview">
                  <p className="hero-preview-eyebrow">EXAMPLE PROPERTY PREVIEW</p>
                  <div className="hero-preview-photo-wrap">
                    <img
                      src={IMG_PROPERTY_PREVIEW}
                      alt="Example North Carolina craftsman home"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <h2 className="hero-preview-title">Your property, connected.</h2>
                  <div className="hero-preview-pills" role="tablist" aria-label="Preview categories">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={heroTab === "records"}
                      className={heroTab === "records" ? "is-active" : ""}
                      onClick={() => setHeroTab("records")}
                    >
                      <FileText size={15} strokeWidth={1.8} aria-hidden="true" />
                      Records
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={heroTab === "maps"}
                      className={heroTab === "maps" ? "is-active" : ""}
                      onClick={() => setHeroTab("maps")}
                    >
                      <Map size={15} strokeWidth={1.8} aria-hidden="true" />
                      Maps
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={heroTab === "resources"}
                      className={heroTab === "resources" ? "is-active" : ""}
                      onClick={() => setHeroTab("resources")}
                    >
                      <Droplets size={15} strokeWidth={1.8} aria-hidden="true" />
                      Resources
                    </button>
                  </div>
                  <div className="hero-preview-map-wrap">
                    <img
                      src={heroTab === "resources" ? IMG_FLOOD_RESOURCES : IMG_AERIAL_MAP}
                      alt={
                        heroTab === "resources"
                          ? "Example flood zone mapping preview"
                          : "Example neighborhood aerial map"
                      }
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="hero-map-pin" aria-hidden="true">
                      <MapPin size={22} strokeWidth={2.2} />
                    </span>
                  </div>
                  <div className="hero-preview-actions">
                    <button type="button" onClick={focusSearchInput}>
                      <FileText size={15} strokeWidth={1.8} aria-hidden="true" />
                      <span>Property details</span>
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={runSampleLookup}>
                      <Sparkles size={15} strokeWidth={1.8} aria-hidden="true" />
                      <span>Try sample lookup</span>
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </aside>
              </div>
            </section>

            {/* QUICK FEATURE STRIP */}
            <section className="feature-strip" aria-label="Available property resources">
              <div className="feature-strip-inner">
                <button type="button" className="feature-strip-item" onClick={focusSearchInput}>
                  <FileText size={22} strokeWidth={1.75} aria-hidden="true" />
                  <span>Property records ({coverageCount} integrated counties)</span>
                </button>
                <button
                  type="button"
                  className="feature-strip-item"
                  onClick={() => {
                    setPreviewTab("maps");
                    document
                      .getElementById("example-preview-section")
                      ?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
                  }}
                >
                  <Map size={22} strokeWidth={1.75} aria-hidden="true" />
                  <span>Maps &amp; aerial views</span>
                </button>
                <a
                  className="feature-strip-item"
                  href="https://fris.nc.gov/fris/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Droplets size={22} strokeWidth={1.75} aria-hidden="true" />
                  <span>Flood resources</span>
                </a>
              </div>
            </section>

            {/* 5. RESOURCE CARDS (CREAM BACKGROUND) */}
            <section className="resource-cards-section" aria-labelledby="explore-heading">
              <div className="section-container">
                <header className="section-header-center">
                  <h2 id="explore-heading">What would you like to explore?</h2>
                  <p>Helpful property resources. One simple starting point.</p>
                </header>

                <div className="resource-cards-grid">
                  {RESOURCE_CARDS.map((card) => {
                    const Icon = card.icon;
                    if (card.action === "external" && card.href) {
                      return (
                        <a
                          key={card.title}
                          className="explore-card"
                          href={card.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <div className="explore-card-media">
                            <img
                              src={card.image}
                              alt={card.imageAlt}
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="explore-card-body">
                            <div className="explore-card-title-row">
                              <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                              <h3>{card.title}</h3>
                            </div>
                            <p>{card.description}</p>
                            <span className="explore-card-cta">
                              Explore <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                            </span>
                          </div>
                        </a>
                      );
                    }
                    return (
                      <button
                        key={card.title}
                        type="button"
                        className="explore-card"
                        onClick={focusSearchInput}
                      >
                        <div className="explore-card-media">
                          <img
                            src={card.image}
                            alt={card.imageAlt}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="explore-card-body">
                          <div className="explore-card-title-row">
                            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                            <h3>{card.title}</h3>
                          </div>
                          <p>{card.description}</p>
                          <span className="explore-card-cta">
                            Explore <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 6. PROPERTY-PREVIEW SECTION (WHITE BACKGROUND, TWO COLUMNS) */}
            <section
              id="example-preview-section"
              className="preview-showcase-section"
              aria-labelledby="clearer-picture-heading"
            >
              <div className="section-container preview-showcase-grid">
                <div className="sample-preview-card" aria-label="Example preview illustration">
                  <div className="sample-preview-top-bar">
                    <p className="sample-preview-label">EXAMPLE PREVIEW</p>
                    <button
                      type="button"
                      className="sample-try-link"
                      onClick={runSampleLookup}
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      Try live sample address
                    </button>
                  </div>
                  <div className="sample-preview-hero-img">
                    <img
                      src={IMG_PROPERTY_PREVIEW}
                      alt="Sample North Carolina residence"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div
                    className="sample-preview-tabs"
                    role="tablist"
                    aria-label="Sample preview sections"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewTab === "records"}
                      className={previewTab === "records" ? "is-active" : ""}
                      onClick={() => setPreviewTab("records")}
                    >
                      Records
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewTab === "maps"}
                      className={previewTab === "maps" ? "is-active" : ""}
                      onClick={() => setPreviewTab("maps")}
                    >
                      Maps
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewTab === "resources"}
                      className={previewTab === "resources" ? "is-active" : ""}
                      onClick={() => setPreviewTab("resources")}
                    >
                      Resources
                    </button>
                  </div>

                  {previewTab === "records" && (
                    <div className="sample-preview-columns" role="tabpanel">
                      <div className="sample-details-col">
                        <h4>Property details</h4>
                        <ul className="sample-interactive-list">
                          <li>
                            <button type="button" onClick={focusSearchInput}>
                              <Home size={16} strokeWidth={1.75} aria-hidden="true" />
                              <span>Year built, heated area &amp; stories</span>
                              <ChevronRight size={14} aria-hidden="true" />
                            </button>
                          </li>
                          <li>
                            <button type="button" onClick={focusSearchInput}>
                              <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
                              <span>County tax card &amp; assessed value</span>
                              <ChevronRight size={14} aria-hidden="true" />
                            </button>
                          </li>
                          <li>
                            <button type="button" onClick={focusSearchInput}>
                              <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
                              <span>Parcel ID / PIN &amp; deed lookup</span>
                              <ChevronRight size={14} aria-hidden="true" />
                            </button>
                          </li>
                        </ul>
                      </div>
                      <div className="sample-map-col">
                        <h4>County resources</h4>
                        <button
                          type="button"
                          className="sample-Supporting-map"
                          onClick={focusSearchInput}
                          aria-label="Enter your address to view county parcel map"
                        >
                          <img
                            src={IMG_AERIAL_MAP}
                            alt="Supporting aerial parcel view"
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="sample-parcel-box" aria-hidden="true" />
                          <span className="sample-map-cta">Search your parcel &rarr;</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {previewTab === "maps" && (
                    <div className="sample-preview-columns" role="tabpanel">
                      <div className="sample-details-col">
                        <h4>Maps &amp; aerial views</h4>
                        <ul className="sample-interactive-list">
                          <li>
                            <button type="button" onClick={focusSearchInput}>
                              <Map size={16} strokeWidth={1.75} aria-hidden="true" />
                              <span>Interactive parcel boundary map</span>
                              <ChevronRight size={14} aria-hidden="true" />
                            </button>
                          </li>
                          <li>
                            <button type="button" onClick={focusSearchInput}>
                              <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
                              <span>County GIS &amp; aerial photography</span>
                              <ChevronRight size={14} aria-hidden="true" />
                            </button>
                          </li>
                          <li>
                            <button type="button" onClick={focusSearchInput}>
                              <Search size={16} strokeWidth={1.75} aria-hidden="true" />
                              <span>Google Maps &amp; Street View links</span>
                              <ChevronRight size={14} aria-hidden="true" />
                            </button>
                          </li>
                        </ul>
                      </div>
                      <div className="sample-map-col">
                        <h4>Aerial neighborhood view</h4>
                        <button
                          type="button"
                          className="sample-Supporting-map"
                          onClick={focusSearchInput}
                          aria-label="Enter your address to explore aerial views"
                        >
                          <img
                            src={IMG_AERIAL_MAP}
                            alt="Aerial neighborhood view"
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="sample-map-cta">Explore your map &rarr;</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {previewTab === "resources" && (
                    <div className="sample-preview-columns" role="tabpanel">
                      <div className="sample-details-col">
                        <h4>Flood &amp; home tools</h4>
                        <ul className="sample-interactive-list">
                          <li>
                            <a
                              href="https://fris.nc.gov/fris/"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Droplets size={16} strokeWidth={1.75} aria-hidden="true" />
                              <span>NC Flood Risk Info System (FRIS)</span>
                              <ExternalLink size={14} aria-hidden="true" />
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://msc.fema.gov/portal/search"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
                              <span>Official FEMA Flood Map Center</span>
                              <ExternalLink size={14} aria-hidden="true" />
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://billlayne.github.io/HOME-INVENTORY/"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Home size={16} strokeWidth={1.75} aria-hidden="true" />
                              <span>Home Inventory Checklist Tool</span>
                              <ExternalLink size={14} aria-hidden="true" />
                            </a>
                          </li>
                        </ul>
                      </div>
                      <div className="sample-map-col">
                        <h4>Statewide flood map</h4>
                        <a
                          className="sample-Supporting-map"
                          href="https://fris.nc.gov/fris/"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={IMG_FLOOD_RESOURCES}
                            alt="Flood map resource illustration"
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="sample-map-cta">Open NC Flood Map &rarr;</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="preview-showcase-copy">
                  <h2 id="clearer-picture-heading">
                    From an address to
                    <br />a clearer picture.
                  </h2>
                  <ol className="preview-steps-list">
                    {PREVIEW_STEPS.map((step) => (
                      <li key={step.num}>
                        <span className="step-badge" aria-hidden="true">
                          {step.num}
                        </span>
                        <div>
                          <h3>{step.title}</h3>
                          <p>{step.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="preview-showcase-actions">
                    <button type="button" className="outlined-gold-btn" onClick={focusSearchInput}>
                      Find My Home <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <button type="button" className="sample-demo-btn" onClick={runSampleLookup}>
                      <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
                      See Sample Report
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. HELPFUL GUIDANCE (CREAM BACKGROUND) */}
            <section className="guidance-section" aria-labelledby="guidance-heading">
              <div className="section-container">
                <header className="section-header-center">
                  <h2 id="guidance-heading">Know what to look for.</h2>
                </header>
                <div className="guidance-grid">
                  {GUIDANCE_CARDS.map(({ icon: Icon, title, text }) => (
                    <article key={title} className="guidance-card">
                      <span className="guidance-icon-wrap" aria-hidden="true">
                        <Icon size={34} strokeWidth={1.6} />
                      </span>
                      <div>
                        <h3>{title}</h3>
                        <p>{text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* 8. CONTACT PANEL */}
            <section id="contact-panel" className="contact-panel-section" aria-labelledby="contact-heading">
              <div
                className="contact-panel-bg"
                style={{ backgroundImage: `url(${IMG_MOUNTAIN_CONTACT})` }}
                aria-hidden="true"
              />
              <div className="contact-panel-overlay" aria-hidden="true" />
              <div className="section-container contact-panel-content">
                <h2 id="contact-heading">
                  Property details raise questions.
                  <span>We’re here to help.</span>
                </h2>
                <p>A local team. A helpful conversation.</p>
                <div className="contact-panel-actions">
                  <a
                    className="gold-cta-btn"
                    href="https://www.billlayneinsurance.com/contact-us/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Talk With Our Team <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
                  </a>
                  <a className="contact-phone-link" href="tel:3368351993">
                    <Phone size={19} strokeWidth={2.1} aria-hidden="true" />
                    <span>336-835-1993</span>
                  </a>
                </div>
              </div>
            </section>

            {/* 9. FAQs */}
            <section className="faq-section" aria-labelledby="faq-heading">
              <div className="section-container faq-container">
                <header className="section-header-center">
                  <h2 id="faq-heading">A few helpful answers.</h2>
                </header>
                <div className="faq-list">
                  {faqs.map((faq) => (
                    <details key={faq.question} className="faq-item">
                      <summary>
                        <span>{faq.question}</span>
                        <span className="faq-plus" aria-hidden="true" />
                      </summary>
                      <div className="faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {activeProperty && response && (
          <div className="results" ref={resultsRef} tabIndex={-1} aria-label="Property report">
            <h1 className="sr-only">
              Find My Home Information <span>Free property report</span>
            </h1>
            <PropertyReport
              key={`${activeProperty.id}-${response.generatedAt}`}
              property={activeProperty}
              response={response}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onChangeAddress={changeAddress}
              quoteHref={quoteUrl.toString()}
              editing={editing}
              editor={
                editing ? (
                  <div className="address-editor">
                    <h2>Find another property</h2>
                    <AddressSearch
                      id="report-search"
                      address={address}
                      onChange={setAddress}
                      onSubmit={handleSubmit}
                      loading={loading}
                      error={error}
                      inputRef={editorInputRef}
                      onCancel={cancelEdit}
                    />
                    <p className="previous-report">
                      {loading ? "Looking up a new address." : "Current report:"}{" "}
                      <strong>{activeProperty.officialAddress}</strong> remains below until another
                      property is found.
                    </p>
                  </div>
                ) : null
              }
            />
          </div>
        )}
      </main>

      {/* 9. FOOTER */}
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-brand-row">
            <img
              className="footer-logo-img"
              src={IMG_AGENCY_LOGO}
              alt="Bill Layne Insurance Agency"
              width={148}
              height={45}
              loading="lazy"
            />
            <span className="footer-sep" aria-hidden="true">
              |
            </span>
            <span className="footer-address">
              <MapPin size={15} strokeWidth={2} aria-hidden="true" />
              1283 N Bridge St, Elkin, NC 28621
            </span>
            <span className="footer-sep" aria-hidden="true">
              &middot;
            </span>
            <a className="footer-contact-link" href="tel:3368351993">
              336-835-1993
            </a>
            <span className="footer-sep" aria-hidden="true">
              &middot;
            </span>
            <a className="footer-contact-link" href="mailto:Save@BillLayneInsurance.com">
              <Mail size={14} strokeWidth={2} aria-hidden="true" />
              Save@BillLayneInsurance.com
            </a>
          </div>

          <nav className="footer-links" aria-label="Legal information">
            <a href="/privacy">Privacy Notice</a>
            <a href="/terms">Terms of Use</a>
            <a href="https://www.billlayneinsurance.com/">Agency Website</a>
          </nav>

          <p className="footer-disclaimer">
            Public records may be incomplete or outdated. Flood resources do not replace an official
            determination, and insurance quotes require a separate review. This tool is not a title
            search, survey, appraisal, or guarantee of insurance eligibility.
          </p>
        </div>
      </footer>

      <nav className="mobile-dock" aria-label="Quick actions">
        <a href="tel:3368351993">
          <Phone size={18} />
          Call agency
        </a>
        <button type="button" onClick={changeAddress}>
          <Search size={18} />
          {activeProperty ? "Change address" : "Find My Home"}
        </button>
      </nav>
    </div>
  );
}
