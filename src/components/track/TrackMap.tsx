import 'leaflet/dist/leaflet.css';

import { divIcon, type DivIcon, type LatLng, type Marker as LeafletMarker } from 'leaflet';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../../app/AppServices';
import { haversineKm } from '../../domain/track/geo';
import { snapToTrack } from '../../domain/track/snap';
import type { Track, TrackPoint } from '../../domain/track/track';

const ROUTE = '#C2410C';
const INK = '#1B1E22';
const SEGMENT = '#7C2D12'; // darker route colour for the highlighted segment
/** Start and finish closer than this are shown as one marker (loop) */
const SAME_PLACE_KM = 0.05;

/** Space kept free on the right for the overlay panel (US7) – at most 40 % of a narrow map */
const PANEL_SPACE_PX = 264;

function FitToTrack({ track, reservePanel }: { track: Track; reservePanel: boolean }) {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      map.invalidateSize({ animate: false }); // Leaflet caches the container size
      const right = reservePanel ? Math.min(PANEL_SPACE_PX, map.getSize().x * 0.4) : 24;
      // without animation: the initial view (MapContainer bounds) differs only by the padding
      map.fitBounds(track.bounds, { paddingTopLeft: [24, 24], paddingBottomRight: [right, 24], animate: false });
    };
    fit();
    // the container changes size with the layout (rotation, phone ↔ tablet): show the whole track again
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      const size = map.getSize();
      if (size.x !== container.clientWidth || size.y !== container.clientHeight) fit();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map, track, reservePanel]);
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
  /** Distance along the track */
  distanceKm: number;
}

export interface TrackMapProps {
  track: Track;
  /** Track point to highlight, e.g. while hovering the elevation profile */
  highlight?: TrackPoint | null;
  checkpoints?: readonly MapCheckpoint[];
  /** Click on (or next to) the track line */
  onTrackClick?: (lat: number, lon: number) => void;
  onCheckpointClick?: (id: string) => void;
  /**
   * Drag and drop of a checkpoint marker along the track (US9). Called with the snapped distance on drop; return
   * `false` to reject the move – the marker then jumps back. Without it the markers can't be dragged.
   */
  onCheckpointMove?: (id: string, distanceKm: number) => boolean;
  /** Checkpoint and distance under the dragged marker while dragging, `null` when the drag ends */
  onCheckpointDrag?: (drag: { id: string; distanceKm: number } | null) => void;
  /** Part of the track to emphasise, e.g. the hovered segment */
  highlightPath?: readonly [number, number][] | null;
  /** Route coloured by an overlay (US7): one line per run of equal class */
  overlayLines?: readonly OverlayLine[] | null;
  /** Shown on top of the map, e.g. the overlay selection and legend */
  children?: ReactNode;
}

export interface OverlayLine {
  key: string;
  classKey: string;
  color: string;
  positions: [number, number][];
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

interface CheckpointMarkerProps {
  checkpoint: MapCheckpoint;
  track: Track;
  onClick?: (id: string) => void;
  onMove?: (id: string, distanceKm: number) => boolean;
  onDrag?: (drag: { id: string; distanceKm: number } | null) => void;
}

/**
 * Numbered checkpoint marker. When `onMove` is given it can be dragged: it stays snapped to the track while dragging,
 * Escape cancels the drag, and a rejected drop puts it back (US9).
 */
function CheckpointMarker({ checkpoint: cp, track, onClick, onMove, onDrag }: CheckpointMarkerProps) {
  const drag = useRef<{ origin: LatLng; distanceKm: number } | null>(null);
  const markerRef = useRef<LeafletMarker>(null);
  const onDragRef = useRef(onDrag);
  useEffect(() => {
    onDragRef.current = onDrag;
  });
  // a new array on every render would make react-leaflet move the marker back while it is being dragged
  const position = useMemo<[number, number]>(() => [cp.lat, cp.lon], [cp.lat, cp.lon]);

  // Escape while dragging: stop the drag (disabling ends it in Leaflet – without a dragend event) and put the marker back
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const marker = markerRef.current;
      const state = drag.current;
      if (e.key !== 'Escape' || !state || !marker?.dragging) return;
      drag.current = null;
      marker.dragging.disable();
      marker.setLatLng(state.origin);
      marker.dragging.enable();
      onDragRef.current?.(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={checkpointIcon(cp.number)}
      title={cp.label}
      alt={cp.label}
      draggable={onMove !== undefined}
      autoPan
      eventHandlers={{
        click: () => onClick?.(cp.id),
        dragstart: (e) => {
          drag.current = { origin: (e.target as LeafletMarker).getLatLng(), distanceKm: cp.distanceKm };
        },
        drag: (e) => {
          if (!drag.current) return;
          const marker = e.target as LeafletMarker;
          const { lat, lng } = marker.getLatLng();
          const snapped = snapToTrack(track, lat, lng);
          marker.setLatLng([snapped.lat, snapped.lon]);
          drag.current.distanceKm = snapped.distanceKm;
          onDrag?.({ id: cp.id, distanceKm: snapped.distanceKm });
        },
        dragend: (e) => {
          const marker = e.target as LeafletMarker;
          const state = drag.current;
          drag.current = null;
          onDrag?.(null);
          if (!state) return;
          const accepted = onMove!(cp.id, state.distanceKm);
          // a rejected drop: back to where it was (the position prop hasn't changed)
          if (!accepted) marker.setLatLng(state.origin);
        },
      }}
    >
      <Tooltip>{cp.label}</Tooltip>
    </Marker>
  );
}

export function TrackMap({
  track,
  highlight,
  checkpoints = [],
  onTrackClick,
  onCheckpointClick,
  onCheckpointMove,
  onCheckpointDrag,
  highlightPath,
  overlayLines,
  children,
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
        <FitToTrack track={track} reservePanel={Boolean(children)} />
        {/* white casing below the route keeps it readable on any map background */}
        <Polyline positions={positions} pathOptions={{ color: '#FFFFFF', weight: 8, opacity: 0.9 }} interactive={false} />
        <Polyline positions={positions} pathOptions={{ color: ROUTE, weight: 4 }} className="track-line" interactive={false} />
        {overlayLines?.map((line) => (
          <Polyline
            key={line.key}
            positions={line.positions}
            pathOptions={{ color: line.color, weight: 5, opacity: 1 }}
            className={`overlay-run overlay-${line.classKey}`}
            interactive={false}
          />
        ))}
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
          <CheckpointMarker
            key={cp.id}
            checkpoint={cp}
            track={track}
            onClick={onCheckpointClick}
            onMove={onCheckpointMove}
            onDrag={onCheckpointDrag}
          />
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
      {children}
    </div>
  );
}
