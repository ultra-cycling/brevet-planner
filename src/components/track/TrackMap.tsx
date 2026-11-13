import 'leaflet/dist/leaflet.css';

import { divIcon, type DivIcon } from 'leaflet';
import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../../app/AppServices';
import { haversineKm } from '../../domain/track/geo';
import type { Track, TrackPoint } from '../../domain/track/track';

const ROUTE = '#C2410C';
const INK = '#1B1E22';
const SEGMENT = '#7C2D12'; // darker route colour for the highlighted segment
/** Start and finish closer than this are shown as one marker (loop) */
const SAME_PLACE_KM = 0.05;

function FitToTrack({ track }: { track: Track }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(track.bounds, { padding: [24, 24] });
  }, [map, track]);
  return null;
}

/** Intermediate control shown as numbered marker */
export interface MapCheckpoint {
  id: string;
  number: number;
  /** Accessible name and tooltip, e.g. "CP2 Riverside Café · 25.1 km" */
  label: string;
  lat: number;
  lon: number;
}

export interface TrackMapProps {
  track: Track;
  /** Track point to highlight, e.g. while hovering the elevation profile */
  highlight?: TrackPoint | null;
  checkpoints?: readonly MapCheckpoint[];
  /** Click on (or next to) the track line */
  onTrackClick?: (lat: number, lon: number) => void;
  onCheckpointClick?: (id: string) => void;
  /** Part of the track to emphasise, e.g. the hovered segment */
  highlightPath?: readonly [number, number][] | null;
}

// one icon per number: a new icon object on every render would make Leaflet replace the marker element
const checkpointIcons = new Map<number, DivIcon>();

function checkpointIcon(number: number): DivIcon {
  let icon = checkpointIcons.get(number);
  if (icon) return icon;
  icon = divIcon({
    className: 'checkpoint-marker',
    html: `<span>${number}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    tooltipAnchor: [14, 0],
  });
  checkpointIcons.set(number, icon);
  return icon;
}

export function TrackMap({
  track,
  highlight,
  checkpoints = [],
  onTrackClick,
  onCheckpointClick,
  highlightPath,
}: TrackMapProps) {
  const { t } = useTranslation();
  const { map } = useConfig();
  const positions = useMemo(() => track.points.map((p) => [p.lat, p.lon] as [number, number]), [track]);
  const start = track.points[0];
  const finish = track.points.at(-1)!;
  const isLoop = haversineKm(start.lat, start.lon, finish.lat, finish.lon) < SAME_PLACE_KM;

  return (
    <div className="track-map" role="region" aria-label={t('map.label')}>
      <MapContainer bounds={track.bounds} boundsOptions={{ padding: [24, 24] }} scrollWheelZoom className="h-100">
        <TileLayer url={map.tileUrl} subdomains={map.subdomains} maxZoom={map.maxZoom} attribution={map.attribution} />
        <FitToTrack track={track} />
        {/* white casing below the route keeps it readable on any map background */}
        <Polyline positions={positions} pathOptions={{ color: '#FFFFFF', weight: 8, opacity: 0.9 }} interactive={false} />
        <Polyline positions={positions} pathOptions={{ color: ROUTE, weight: 4 }} className="track-line" interactive={false} />
        {highlightPath && (
          <Polyline
            positions={highlightPath as [number, number][]}
            pathOptions={{ color: SEGMENT, weight: 7, opacity: 0.9 }}
            className="segment-highlight"
            interactive={false}
          />
        )}
        {onTrackClick && (
          // wide transparent line on top: makes the track easy to hit with mouse or finger
          <Polyline
            positions={positions}
            pathOptions={{ color: ROUTE, weight: 22, opacity: 0 }}
            className="track-hit"
            bubblingMouseEvents={false}
            eventHandlers={{ click: (e) => onTrackClick(e.latlng.lat, e.latlng.lng) }}
          >
            <Tooltip sticky>{t('map.addCheckpoint')}</Tooltip>
          </Polyline>
        )}
        <CircleMarker
          center={[start.lat, start.lon]}
          radius={8}
          pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: INK, fillOpacity: 1 }}
          className="track-endpoint"
        >
          <Tooltip>{isLoop ? t('map.startFinish') : t('map.start')}</Tooltip>
        </CircleMarker>
        {!isLoop && (
          <CircleMarker
            center={[finish.lat, finish.lon]}
            radius={8}
            pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: INK, fillOpacity: 1 }}
            className="track-endpoint"
          >
            <Tooltip>{t('map.finish')}</Tooltip>
          </CircleMarker>
        )}
        {checkpoints.map((cp) => (
          <Marker
            key={cp.id}
            position={[cp.lat, cp.lon]}
            icon={checkpointIcon(cp.number)}
            title={cp.label}
            alt={cp.label}
            eventHandlers={{ click: () => onCheckpointClick?.(cp.id) }}
          >
            <Tooltip>{cp.label}</Tooltip>
          </Marker>
        ))}
        {highlight && (
          <CircleMarker
            center={[highlight.lat, highlight.lon]}
            radius={7}
            pathOptions={{ color: ROUTE, weight: 3, fillColor: '#FFFFFF', fillOpacity: 1 }}
            className="track-highlight"
            interactive={false}
          />
        )}
      </MapContainer>
    </div>
  );
}
