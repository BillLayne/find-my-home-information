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

    const rings = property.parcelRings.map((ring) => ring.map(([longitude, latitude]) => [latitude, longitude] as L.LatLngTuple));
    const parcel = L.polygon(rings, {
      color: "#f6c453",
      weight: 3,
      fillColor: "#f2b84b",
      fillOpacity: 0.1,
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

    map.fitBounds(parcel.getBounds(), { padding: [36, 36], maxZoom: 19 });
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
    };
  }, [property.latitude, property.longitude, property.parcelRings]);

  if (!property.parcelRings?.length) return null;

  return (
    <section id="parcel-map" className="parcel-map-section" aria-labelledby="parcel-map-title">
      <div className="parcel-map-frame">
        <span className="parcel-map-chip"><MapPinned size={14} aria-hidden="true" />Aerial view &middot; county parcel boundary</span>
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
