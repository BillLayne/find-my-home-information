import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink, MapPinned } from "lucide-react";
import type { PublicProperty } from "../shared/property";

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
    <section className="parcel-map-section" aria-labelledby="parcel-map-title">
      <div className="parcel-map-heading">
        <div>
          <p className="eyebrow">Verified parcel location</p>
          <h3 id="parcel-map-title">See the matched parcel boundary</h3>
          <span><MapPinned size={15} />Boundary supplied by the county parcel service</span>
        </div>
        {property.links.gisParcel || property.links.gis ? (
          <a href={property.links.gisParcel || property.links.gis} target="_blank" rel="noopener noreferrer">
            Open official parcel source <ExternalLink size={16} />
          </a>
        ) : null}
      </div>
      <div className="parcel-map" ref={containerRef} aria-label={`Highlighted parcel map for ${property.officialAddress}`} />
      <p className="parcel-map-note">Parcel lines are for reference only and are not a survey or legal boundary determination.</p>
    </section>
  );
}
