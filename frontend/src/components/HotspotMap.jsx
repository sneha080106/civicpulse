import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchHotspots } from '../services/api';
import districtCoordinates from '../data/districtCoordinates';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

const INDIA_CENTER = [23.6, 86.5];
const DEFAULT_ZOOM = 6;

// Fixed 4-band visualization scale over the 0-100 hotspot score. This is a
// display convention for color/size only — it is not a policy threshold and
// does not feed back into any scoring formula.
const BANDS = [
  { max: 25, label: 'Low', color: '#3f7a5c' },
  { max: 50, label: 'Medium', color: '#b08a2e' },
  { max: 75, label: 'High', color: '#c1652b' },
  { max: Infinity, label: 'Critical', color: '#9b2c2c' },
];

const getBand = (score) => BANDS.find((b) => score <= b.max) || BANDS[BANDS.length - 1];
const radiusForScore = (score) => 9 + (Math.max(0, Math.min(100, score)) / 100) * 12;

// Backend now returns one already-aggregated row per district (Step 20 fix),
// so this just guards against any accidental duplicate district entries —
// keeping the highest hotspotScore per district if that ever happens.
const buildDistrictMarkers = (hotspots) => {
  const byDistrict = new Map();
  hotspots.forEach((h) => {
    const existing = byDistrict.get(h.district);
    if (!existing || h.hotspotScore > existing.hotspotScore) {
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
            const band = getBand(marker.hotspotScore);
            return (
              <CircleMarker
                key={marker.district}
                center={[coords.lat, coords.lng]}
                radius={radiusForScore(marker.hotspotScore)}
                pathOptions={{ color: band.color, fillColor: band.color, fillOpacity: 0.65, weight: 1.5 }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  {marker.district} — {marker.hotspotScore} ({band.label})
                </Tooltip>
                <Popup>
                  <div className="map-popup">
                    <div className="map-popup-title">{marker.district}</div>
                    {marker.state && <div className="map-popup-sub">{marker.state}</div>}

                    <div className="map-popup-score">{marker.hotspotScore}</div>
                    <div className="map-popup-band" style={{ color: band.color }}>{band.label} hotspot</div>

                    <div className="map-popup-row"><span>Top-demand sector</span><span>{marker.sector}</span></div>
                    <div className="map-popup-row"><span>Citizen requests</span><span>{marker.citizenRequestCount}</span></div>
                    <div className="map-popup-row"><span>Infrastructure gap</span><span>{marker.infrastructureGap}</span></div>
                    {marker.investmentGap !== undefined && marker.investmentGap !== null && (
                      <div className="map-popup-row"><span>Investment gap</span><span>{marker.investmentGap}</span></div>
                    )}
                    {marker.affectedPopulation !== undefined && marker.affectedPopulation !== null && (
                      <div className="map-popup-row"><span>Affected population</span><span>{marker.affectedPopulation.toLocaleString?.() ?? marker.affectedPopulation}</span></div>
                    )}
                    {marker.recommendation && (
                      <div className="map-popup-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                        <span>Recommendation</span>
                        <span style={{ fontWeight: 400, textAlign: 'left' }}>{marker.recommendation}</span>
                      </div>
                    )}
                    {marker.whyHotspot && marker.whyHotspot.length > 0 && (
                      <div className="map-popup-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                        <span>Why this is a hotspot</span>
                        <span style={{ fontWeight: 400, textAlign: 'left' }}>{marker.whyHotspot.join(', ')}</span>
                      </div>
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
          Marker size and color reflect the regional hotspot score. Fixed 0–100 visualization scale, not a policy threshold.
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