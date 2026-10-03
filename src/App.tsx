import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { Camera, CheckCircle2, FileSearch, FileText, Home, LoaderCircle, Mail, Map, MapPin, Phone, Search, ShieldCheck, Waves } from "lucide-react";
import type { PublicPropertyResponse } from "../shared/property";
import { findCountyCoverage, findProperty } from "./lib/api";
import { validateAddress } from "./lib/report";
import { LegalPage } from "./LegalPage";
import { PropertyReport } from "./PropertyReport";

const FEATURES = [
  { image: "property-photos-maps.webp", alt: "Illustrative aerial view of a home and parcel boundary", icon: Camera, title: "Photos and aerial maps", text: "Street View, county imagery, and available home photos." },
  { image: "property-hazard-resources.webp", alt: "Tablet displaying an illustrative flood map", icon: Waves, title: "Flood and hazard resources", text: "Official FEMA and North Carolina mapping resources." },
  { image: "property-county-records.webp", alt: "Sample assessment, deed, and parcel documents", icon: FileSearch, title: "County public records", text: "Available property cards, assessments, parcel maps, and deed searches." },
  { image: "property-home-inventory.webp", alt: "Homeowner photographing a living room for an inventory", icon: FileText, title: "Home inventory resources", text: "Belongings inventories and worksheets for before or after a loss." },
];

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
}

function AddressSearch({ id, address, onChange, onSubmit, loading, error, inputRef, onCancel }: {
  id: string; address: string; onChange: (value: string) => void; onSubmit: (event: FormEvent) => void;
  loading: boolean; error: string; inputRef: RefObject<HTMLInputElement | null>; onCancel?: () => void;
}) {
  return (
    <form id={id} className="search-form" onSubmit={onSubmit} noValidate>
      <label className="search-label" htmlFor={`${id}-address`}>Street address, city and ZIP code</label>
      <div className="search-fields">
        <div className="search-input-wrap">
          <MapPin size={20} aria-hidden="true" />
          <input id={`${id}-address`} ref={inputRef} value={address} onChange={(event) => onChange(event.target.value)}
            placeholder="123 Main St, Elkin, NC 28621" autoComplete="street-address" type="search" readOnly={loading}
            aria-invalid={Boolean(error)} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <Search size={19} aria-hidden="true" />}
          {loading ? "Finding records" : "Find my home"}
        </button>
      </div>
      <p id={`${id}-hint`} className="search-hint">North Carolina addresses. Available details vary by county.</p>
      {error && <p id={`${id}-error`} className="search-error" role="alert">{error}</p>}
      <div className="search-feedback">
        <span role="status">{loading ? "Searching public property records..." : ""}</span>
        {onCancel && <button className="text-button" type="button" onClick={onCancel}>{loading ? "Cancel lookup" : "Cancel"}</button>}
      </div>
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
      const preferredIndex = preferredParcel ? result.results.findIndex((property) => property.parcelId === preferredParcel || property.pin === preferredParcel) : 0;
      setSelectedIndex(Math.max(0, preferredIndex));
      setEditing(false);
      // Consume an incoming share link without keeping the address in browser history.
      window.history.replaceState(null, "", window.location.pathname);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
        resultsRef.current?.focus({ preventScroll: true });
      });
    } catch (lookupError) {
      if (!controller.signal.aborted) setError(lookupError instanceof Error ? lookupError.message : "Property lookup failed. Please try again.");
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
      searchInputRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
      searchInputRef.current?.focus({ preventScroll: true });
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
    return () => { pendingRequest.current?.abort(); pendingRequest.current = null; };
    // An incoming share link is consumed once, not on subsequent form edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    findCountyCoverage().then((count) => { if (!cancelled) setCoverageCount(count); }).catch(() => {});
    return () => { cancelled = true; };
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

  return (
    <div className={`app-shell${activeProperty ? " report-page" : ""}`}>
      <a className="skip-link" href="#main-content">Skip to {activeProperty ? "property report" : "property search"}</a>
      <header className="site-header">
        <a className="brand" href="https://www.billlayneinsurance.com/" aria-label="Bill Layne Insurance home">
          <span className="brand-mark"><Home size={20} aria-hidden="true" /></span>
          <span><strong>Find My Home</strong><small>by Bill Layne Insurance</small></span>
        </a>
        <div className="header-actions">
          {activeProperty && <span className="header-tag">Free property report</span>}
          <a href="tel:3368351993" aria-label="Call Bill Layne Insurance at 336-835-1993"><Phone size={16} />336-835-1993</a>
          <a href="mailto:save@billlayneinsurance.com"><Mail size={16} />Email Agency</a>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {!activeProperty && <>
          <section className="search-hero">
            <div className="hero-image" aria-hidden="true" /><div className="hero-overlay" aria-hidden="true" />
            <div className="hero-content">
              <p className="hero-kicker"><MapPin size={16} />Free North Carolina property resource</p>
              <h1>Find Your North Carolina <span>Home Information</span></h1>
              <p className="hero-lead">Property records, photos, maps, and flood resources. Start with your address.</p>
              <AddressSearch id="property-search" address={address} onChange={setAddress} onSubmit={handleSubmit} loading={loading} error={error} inputRef={searchInputRef} />
              <div className="trust-row">
                <span><CheckCircle2 size={16} />No account required</span>
                <span><CheckCircle2 size={16} />No saved search history</span>
              </div>
            </div>
          </section>
          <section className="scope-band" aria-label="Available coverage">
            <div><Map size={23} /><span><strong>{coverageCount} integrated counties</strong><small>Automatic details where available</small></span></div>
            <div><ShieldCheck size={23} /><span><strong>Statewide hazard resources</strong><small>FEMA and North Carolina links</small></span></div>
            <div><CheckCircle2 size={23} /><span><strong>Public information only</strong><small>No private agency records</small></span></div>
          </section>
        </>}

        {activeProperty && response ? (
          <div className="results" ref={resultsRef} tabIndex={-1} aria-label="Property report">
            <h1 className="sr-only">Find My Home Information <span>Free property report</span></h1>
            <PropertyReport key={`${activeProperty.id}-${response.generatedAt}`} property={activeProperty} response={response} selectedIndex={selectedIndex}
              onSelect={setSelectedIndex} onChangeAddress={changeAddress} quoteHref={quoteUrl.toString()} editing={editing}
              editor={editing ? <div className="address-editor">
                <h2>Find another property</h2>
                <AddressSearch id="report-search" address={address} onChange={setAddress} onSubmit={handleSubmit} loading={loading} error={error} inputRef={editorInputRef} onCancel={cancelEdit} />
                <p className="previous-report">{loading ? "Looking up a new address." : "Current report:"} <strong>{activeProperty.officialAddress}</strong> remains below until another property is found.</p>
              </div> : null} />
          </div>
        ) : (
          <section className="pre-search">
            <div className="section-heading"><p>Available public resources</p><h2>Your home, from more than one angle.</h2></div>
            <div className="pre-search-grid">
              {FEATURES.map(({ image, alt, icon: Icon, title, text }) => <article className="feature-card" key={image}>
                <img src={`/assets/${image}`} alt={alt} width="1200" height="800" loading="lazy" />
                <div className="feature-card-body"><h3><Icon size={20} aria-hidden="true" />{title}</h3><p>{text}</p></div>
              </article>)}
            </div>
          </section>
        )}
      </main>
      <footer>
        <strong>Bill Layne Insurance Agency</strong><span>1283 N Bridge St, Elkin, NC 28621</span>
        <nav className="footer-links" aria-label="Legal information"><a href="/privacy">Privacy Notice</a><a href="/terms">Terms of Use</a><a href="https://www.billlayneinsurance.com/">Agency Website</a></nav>
        <span>Public records can be incomplete or outdated. This tool is not a title search, survey, flood determination, appraisal, or guarantee of insurance eligibility.</span>
      </footer>
      <nav className="mobile-dock" aria-label="Quick actions">
        <a href="tel:3368351993"><Phone size={18} />Call agency</a>
        <button type="button" onClick={changeAddress}><Search size={18} />{activeProperty ? "Change address" : "Find a home"}</button>
      </nav>
    </div>
  );
}
