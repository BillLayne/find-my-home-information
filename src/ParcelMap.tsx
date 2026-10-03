import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowUpRight, MapPinned } from "lucide-react";
import type { PublicProperty } from "../shared/property";
import { destinationKind } from "./lib/report";

export function ParcelMap({ property }: { property: PublicProperty }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !property.parcelRings?.length) return;

    const map = L.map(containerRef.current, {
      attributionControl: true,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const rings = property.parcelRings.map((ring) => ring.map(([longitude, latitude]) => [latitude, longitude] as L.LatLngTuple));
    const parcel = L.polygon(rings, {
      color: "#0b6f9f",
      weight: 4,
      fillColor: "#f2b84b",
      fillOpacity: 0.24,
    }).addTo(map);

    if (property.latitude != null && property.longitude != null) {
      L.circleMarker([property.latitude, property.longitude], {
        radius: 7,
        color: "#ffffff",
        weight: 3,
        fillColor: "#147a67",
        fillOpacity: 1,
      }).addTo(map).bindTooltip("Searched address");
    }

    map.fitBounds(parcel.getBounds(), { padding: [28, 28], maxZoom: 18 });
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
    };
  }, [property.latitude, property.longitude, property.parcelRings]);

  if (!property.parcelRings?.length) return null;

  return (
    <section id="parcel-map" className="parcel-map-section" aria-labelledby="parcel-map-title">
      <div className="parcel-map-frame">
        <span className="parcel-map-chip"><MapPinned size={14} aria-hidden="true" />County parcel boundary</span>
        <div className="parcel-map" ref={containerRef} aria-label={`Highlighted parcel map for ${property.officialAddress}`} />
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
