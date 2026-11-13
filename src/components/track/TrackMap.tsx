import 'leaflet/dist/leaflet.css';

import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../../app/AppServices';
import { haversineKm } from '../../domain/track/geo';
import type { Track, TrackPoint } from '../../domain/track/track';

const ROUTE = '#C2410C';
const INK = '#1B1E22';
/** Start and finish closer than this are shown as one marker (loop) */
const SAME_PLACE_KM = 0.05;

function FitToTrack({ track }: { track: Track }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(track.bounds, { padding: [24, 24] });
  }, [map, track]);
  return null;
}

export interface TrackMapProps {
  track: Track;
  /** Track point to highlight, e.g. while hovering the elevation profile */
  highlight?: TrackPoint | null;
}

export function TrackMap({ track, highlight }: TrackMapProps) {
  const { t } = useTranslation();
  const { map } = useConfig();
  const positions = track.points.map((p) => [p.lat, p.lon] as [number, number]);
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
        <CircleMarker center={[start.lat, start.lon]} radius={8} pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: INK, fillOpacity: 1 }}>
          <Tooltip>{isLoop ? t('map.startFinish') : t('map.start')}</Tooltip>
        </CircleMarker>
        {!isLoop && (
          <CircleMarker center={[finish.lat, finish.lon]} radius={8} pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: INK, fillOpacity: 1 }}>
            <Tooltip>{t('map.finish')}</Tooltip>
          </CircleMarker>
        )}
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
