// SYNTHETIC DEMO DATA ONLY. Indexes are deliberately varied (not random)
// so that districts with many matching citizen complaints also show
// poor infrastructure — creating a clear demo narrative.

const infrastructure = [
  {
    regionId: 'JH-RAN', // Ranchi — poor healthcare, moderate roads
    roadConnectivityIndex: 55,
    healthcareAccessIndex: 38,
    educationAccessIndex: 50,
    waterAccessIndex: 45,
    electricityAccessIndex: 60,
    internetAccessIndex: 40,
    dataYear: 2025,
    dataSource: 'CivicPulse Synthetic Demo Dataset',
  },
  {
    regionId: 'JH-JSR', // Jamshedpur — generally good infra
    roadConnectivityIndex: 70,
    healthcareAccessIndex: 72,
    educationAccessIndex: 68,
    waterAccessIndex: 65,
    electricityAccessIndex: 80,
    internetAccessIndex: 60,
    dataYear: 2025,
    dataSource: 'CivicPulse Synthetic Demo Dataset',
  },
  {
    regionId: 'JH-DHN', // Dhanbad — moderate
    roadConnectivityIndex: 50,
    healthcareAccessIndex: 48,
    educationAccessIndex: 55,
    waterAccessIndex: 40,
    electricityAccessIndex: 58,
    internetAccessIndex: 42,
    dataYear: 2025,
    dataSource: 'CivicPulse Synthetic Demo Dataset',
  },
  {
    regionId: 'BR-GAY', // Gaya — poor healthcare & water
    roadConnectivityIndex: 35,
    healthcareAccessIndex: 32,
    educationAccessIndex: 40,
    waterAccessIndex: 30,
    electricityAccessIndex: 45,
    internetAccessIndex: 25,
    dataYear: 2025,
    dataSource: 'CivicPulse Synthetic Demo Dataset',
  },
  {
    regionId: 'BR-MUZ', // Muzaffarpur — poor water, weak overall
    roadConnectivityIndex: 40,
    healthcareAccessIndex: 42,
    educationAccessIndex: 38,
    waterAccessIndex: 35,
    electricityAccessIndex: 48,
    internetAccessIndex: 30,
    dataYear: 2025,
    dataSource: 'CivicPulse Synthetic Demo Dataset',
  },
  {
    regionId: 'WB-KOL', // Kolkata — strong infra across the board
    roadConnectivityIndex: 80,
    healthcareAccessIndex: 78,
    educationAccessIndex: 82,
    waterAccessIndex: 75,
    electricityAccessIndex: 88,
    internetAccessIndex: 85,
    dataYear: 2025,
    dataSource: 'CivicPulse Synthetic Demo Dataset',
  },
  {
    regionId: 'WB-SIL', // Siliguri — moderate
    roadConnectivityIndex: 62,
    healthcareAccessIndex: 58,
    educationAccessIndex: 60,
    waterAccessIndex: 55,
    electricityAccessIndex: 65,
    internetAccessIndex: 55,
    dataYear: 2025,
    dataSource: 'CivicPulse Synthetic Demo Dataset',
  },
  {
    regionId: 'WB-PUR', // Purulia — weakest infra overall
    roadConnectivityIndex: 30,
    healthcareAccessIndex: 35,
    educationAccessIndex: 33,
    waterAccessIndex: 28,
    electricityAccessIndex: 40,
    internetAccessIndex: 20,
    dataYear: 2025,
    dataSource: 'CivicPulse Synthetic Demo Dataset',
  },
  {
    regionId: 'OD-BBS', // Bhubaneswar — strongest infra
    roadConnectivityIndex: 85,
    healthcareAccessIndex: 80,
    educationAccessIndex: 83,
    waterAccessIndex: 78,
    electricityAccessIndex: 90,
    internetAccessIndex: 82,
    dataYear: 2025,
    dataSource: 'CivicPulse Synthetic Demo Dataset',
  },
  {
    regionId: 'OD-CTC', // Cuttack — moderately good
    roadConnectivityIndex: 68,
    healthcareAccessIndex: 65,
    educationAccessIndex: 70,
    waterAccessIndex: 60,
    electricityAccessIndex: 72,
    internetAccessIndex: 58,
    dataYear: 2025,
    dataSource: 'CivicPulse Synthetic Demo Dataset',
  },
];

module.exports = infrastructure;