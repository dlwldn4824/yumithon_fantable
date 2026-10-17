"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { useEffect } from "react";

export type Pin = { id: string; name: string; lat: number; lng: number; kind: "spot" | "bookable"; parent?: string };

const STAR = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z"/></svg>';
const CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

const icon = (kind: Pin["kind"], active: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    html: `<div class="pin pin-${kind}${active ? " pin-on" : ""}"><span>${kind === "spot" ? STAR : CHECK}</span></div>`,
  });

function Fit({ pins }: { pins: Pin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
  }, [pins, map]);
  return null;
}

export default function FanMap({ pins, active, onPick }: { pins: Pin[]; active?: string; onPick: (id: string) => void }) {
  const byId = Object.fromEntries(pins.map((p) => [p.id, p]));
  return (
    <MapContainer center={[37.5665, 126.978]} zoom={12} zoomControl={false} attributionControl className="map">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
        className="tiles"
      />
      {pins
        .filter((p) => p.parent && byId[p.parent])
        .map((p) => (
          <Polyline key={`l-${p.id}-${p.parent}`} positions={[[byId[p.parent!].lat, byId[p.parent!].lng], [p.lat, p.lng]]}
            pathOptions={{ color: "#7f9fe6", weight: 2, dashArray: "4 6", opacity: 0.7 }} />
        ))}
      {pins.map((p) => (
        <Marker key={`${p.kind}-${p.id}-${p.parent ?? ""}`} position={[p.lat, p.lng]} icon={icon(p.kind, active === p.id)}
          eventHandlers={{ click: () => onPick(p.parent ?? p.id) }} />
      ))}
      <Fit pins={pins} />
    </MapContainer>
  );
}
