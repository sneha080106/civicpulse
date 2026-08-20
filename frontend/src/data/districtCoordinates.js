/**
 * Static geographic reference for the CivicPulse demo districts, used ONLY
 * for placing map markers. These are real, public, well-known coordinates
 * for the real Indian cities that the synthetic seed data names its demo
 * districts after — not fabricated positions, and not part of the
 * deterministic priority calculation in any way.
 *
 * If a district returned by the backend has no entry here, the map skips
 * it rather than guessing a location.
 */
const districtCoordinates = {
  Ranchi: { lat: 23.3441, lng: 85.3096 },
  Jamshedpur: { lat: 22.8046, lng: 86.2029 },
  Dhanbad: { lat: 23.7957, lng: 86.4304 },
  Gaya: { lat: 24.7955, lng: 84.9994 },
  Muzaffarpur: { lat: 26.1209, lng: 85.3647 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Siliguri: { lat: 26.7271, lng: 88.3953 },
  Purulia: { lat: 23.3320, lng: 86.3616 },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  Cuttack: { lat: 20.4625, lng: 85.8828 },
};

export default districtCoordinates;