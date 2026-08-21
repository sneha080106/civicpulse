import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchHotspots } from '../services/api';
import districtCoordinates from '../data/districtCoordinates';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

const INDIA_CENTER = [23.6, 86.5];
const DEFAULT_ZOOM = 6;

// Fixed 4-band visualization scale over the 0-100 priority score. This is a
// display convention for color/size only — it is not a policy threshold and
// does not feed back into the priority formula.
const BANDS = [
  { max: 25, label: 'Low', color: '#3f7a5c' },
  { max: 50, label: 'Medium', color: '#b08a2e' },
  { max: 75, label: 'High', color: '#c1652b' },
  { max: Infinity, label: 'Critical', color: '#9b2c2c' },
];

const getBand = (score) => BANDS.find((b) => score <= b.max) || BANDS[BANDS.length - 1];
const radiusForScore = (score) => 9 + (Math.max(0, Math.min(100, score)) / 100) * 12;

// Reduces the full district-sector hotspot list down to one marker per
// district: the sector with that district's own highest priority score.
const buildDistrictMarkers = (hotspots) => {
  const byDistrict = new Map();
  hotspots.forEach((h) => {
    const existing = byDistrict.get(h.district);
    if (!existing || h.priorityScore > existing.priorityScore) {
      byDistrict.set(h.district, h);
    }
  });
  return Array.from(byDistrict.values());
};

const HotspotMap = ({ country }) => {
  const [hotspots, setHotspots] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
          const response = await fetchHotspots(100, country);
        if (!cancelled) {
          setHotspots(response.hotspots || []);
          setStatus('success');
        }
      } catch (err) {
        if (!cancelled) setStatus('error');
      }
    };

      load();
    return () => { cancelled = true; };
  }, [country]);

  if (status === 'loading') return <LoadingState label="Loading geographic hotspots..." />;

  if (status === 'error') {
    return <EmptyState title="Unable to load hotspot map" description="The backend may be offline, or priority analysis has not yet been run." />;
  }

  const districtMarkers = buildDistrictMarkers(hotspots);
  const plottable = districtMarkers.filter((m) => districtCoordinates[m.district]);
  const unplottable = districtMarkers.filter((m) => !districtCoordinates[m.district]);

  if (districtMarkers.length === 0) {
    return <EmptyState title="No hotspot data yet" description="Run priority analysis on the backend to populate the map." />;
  }

  return (
    <div>
      <div className="map-container surface-card">
        <MapContainer center={INDIA_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom={false} style={{ height: '420px', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {plottable.map((marker) => {
            const coords = districtCoordinates[marker.district];
            const band = getBand(marker.priorityScore);
            return (
              <CircleMarker
                key={marker.district}
                center={[coords.lat, coords.lng]}
                radius={radiusForScore(marker.priorityScore)}
                pathOptions={{ color: band.color, fillColor: band.color, fillOpacity: 0.65, weight: 1.5 }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  {marker.district} — {marker.priorityScore} ({band.label})
                </Tooltip>
                <Popup>
                  <div className="map-popup">
                    <div className="map-popup-title">{marker.district}</div>
                    {marker.state && <div className="map-popup-sub">{marker.state}</div>}

                    <div className="map-popup-score">{marker.priorityScore}</div>
                    <div className="map-popup-band" style={{ color: band.color }}>{band.label} priority</div>

                    <div className="map-popup-row"><span>Highest-priority sector</span><span>{marker.sector}</span></div>
                    <div className="map-popup-row"><span>Demand score</span><span>{marker.demandScore}</span></div>
                    <div className="map-popup-row"><span>Infrastructure gap</span><span>{marker.infrastructureGap}</span></div>
                    {marker.populationImpact !== undefined && (
                      <div className="map-popup-row"><span>Population impact</span><span>{marker.populationImpact}</span></div>
                    )}
                    {marker.urgencyScore !== undefined && (
                      <div className="map-popup-row"><span>Urgency</span><span>{marker.urgencyScore}</span></div>
                    )}
                    {marker.investmentGap !== undefined && (
                      <div className="map-popup-row"><span>Investment gap</span><span>{marker.investmentGap}</span></div>
                    )}
                    {marker.affectedPopulation !== undefined && marker.affectedPopulation !== null && (
                      <div className="map-popup-row"><span>Affected population</span><span>{marker.affectedPopulation.toLocaleString?.() ?? marker.affectedPopulation}</span></div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="map-legend">
        {BANDS.map((band) => (
          <div key={band.label} className="map-legend-item">
            <span className="map-legend-dot" style={{ background: band.color }} />
            <span>{band.label} ({band.max === Infinity ? '75–100' : `${band.max - 25}–${band.max}`})</span>
          </div>
        ))}
        <span className="form-hint" style={{ marginLeft: 'auto' }}>
          Marker size and color reflect priority score. Fixed 0–100 visualization scale, not a policy threshold.
        </span>
      </div>

      {unplottable.length > 0 && (
        <div className="form-hint" style={{ marginTop: '8px' }}>
          Not shown on map (no geographic reference available): {unplottable.map((m) => m.district).join(', ')}
        </div>
      )}
    </div>
  );
};

export default HotspotMap;