import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowUpRight, MapPinned } from "lucide-react";
import type { PublicProperty } from "../shared/property";
import { destinationKind } from "./lib/report";

export function ParcelMap({ property }: { property: PublicProperty }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !property.parcelRings?.length) return;
    const rings = property.parcelRings.map((ring) => ring.map(([longitude, latitude]) => [latitude, longitude] as L.LatLngTuple));

    const build = (container: HTMLDivElement, forPrint: boolean) => {
      const map = L.map(container, {
        attributionControl: true,
        scrollWheelZoom: false,
        zoomControl: !forPrint,
        dragging: !forPrint,
        doubleClickZoom: !forPrint,
        keyboard: !forPrint,
        // The printed sheet is captured the instant the print dialog opens, so
        // its tiles must already be fully opaque rather than mid fade-in.
        fadeAnimation: !forPrint,
        zoomAnimation: !forPrint,
      });

      // Street map underneath as a fallback: if an aerial tile is unavailable the
      // street tile shows through instead of a blank square.
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 20,
        maxNativeZoom: 19,
      }).addTo(map);

      // North Carolina statewide aerial photography (public, NC OneMap).
      L.tileLayer("https://services.nconemap.gov/secure/rest/services/Imagery/Orthoimagery_Latest_cached/ImageServer/tile/{z}/{y}/{x}", {
        attribution: "Imagery: NC OneMap",
        maxZoom: 20,
        maxNativeZoom: 20,
      }).addTo(map);

      const parcel = L.polygon(rings, { color: "#f6c453", weight: 3, fillColor: "#f2b84b", fillOpacity: 0.1 }).addTo(map);
      if (property.latitude != null && property.longitude != null) {
        const marker = L.circleMarker([property.latitude, property.longitude], { radius: forPrint ? 5 : 7, color: "#ffffff", weight: forPrint ? 2 : 3, fillColor: "#147a67", fillOpacity: 1 }).addTo(map);
        if (!forPrint) marker.bindTooltip("Searched address");
      }

      const fit = () => {
        const bounds = parcel.getBounds();
        map.invalidateSize({ animate: false, pan: false });
        const pad = forPrint ? L.point(24, 24) : L.point(64, 64);
        const zoom = Math.min(map.getBoundsZoom(bounds, false, pad), forPrint ? 18 : 19);
        map.setView(bounds.getCenter(), zoom, { animate: false });
      };
      return { map, fit };
    };

    const screen = build(containerRef.current, false);
    // Re-fitting the on-screen map when the print dialog opens swapped in tiles
    // that had not loaded yet, so the sheet printed a blank map. The on-screen
    // map is now left alone while printing.
    const fitScreen = () => { if (!window.matchMedia("print").matches) screen.fit(); };
    fitScreen();
    requestAnimationFrame(fitScreen);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fitScreen) : null;
    observer?.observe(containerRef.current);

    // A second, fixed-size map exists only for the printed sheet. It is laid out
    // off-screen at its print size from the start, so its aerial tiles are
    // already loaded when the customer prints.
    const print = printRef.current ? build(printRef.current, true) : null;
    print?.fit();

    return () => {
      observer?.disconnect();
      screen.map.remove();
      print?.map.remove();
    };
  }, [property.latitude, property.longitude, property.parcelRings]);

  if (!property.parcelRings?.length) return null;

  return (
    <section id="parcel-map" className="parcel-map-section" aria-labelledby="parcel-map-title">
      <div className="print-only print-panel-cap">AERIAL PARCEL &amp; BOUNDARY MAP</div>
      <div className="parcel-map-frame">
        <span className="parcel-map-chip"><MapPinned size={14} aria-hidden="true" />Aerial view &middot; county parcel boundary</span>
        <div className="parcel-map" ref={containerRef} aria-label={`Highlighted parcel map for ${property.officialAddress}`} />
        <div className="parcel-map-print" ref={printRef} aria-hidden="true" />
      </div>
      <div className="parcel-map-footer">
        <h3 id="parcel-map-title">Parcel map</h3>
        {property.links.gisParcel || property.links.gis ? (
          <a href={property.links.gisParcel || property.links.gis} target="_blank" rel="noopener noreferrer">
            {destinationKind(property.links.gisParcel || property.links.gis, property) === "record" ? "Open parcel record" : "Open GIS map"} <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only">Opens in a new tab</span>
          </a>
        ) : null}
      </div>
      <p className="parcel-map-note">Parcel lines are for reference only and are not a survey or legal boundary determination.</p>
    </section>
  );
}
