// SYNTHETIC DEMONSTRATION DATA ONLY — not official government statistics.
// Covers Brazil, Russia, China, South Africa. India is intentionally
// excluded here — its existing seed data (seedDatabase.js) is untouched
// and remains the sole source of India records.
//
// Region IDs are prefixed by country code (BR-, RU-, CN-, ZA-) to guarantee
// no collision with existing India regionIds (JH-, BR (Bihar, unrelated to
// Brazil's BR prefix here) -, WB-, OD- etc.) — note: India's existing
// "BR-GAY" (Bihar/Gaya) predates this file and is NOT touched; new Brazil
// regions here use distinct codes (BRZ-) to avoid any ambiguity.

const demographics = [
  // --- Brazil ---
  { regionId: 'BRZ-SAO', country: 'Brazil', stateProvince: 'São Paulo', district: 'São Paulo', population: 12300000, populationDensity: 7900, ruralPopulation: 300000, urbanPopulation: 12000000, vulnerablePopulationIndicator: 35 },
  { regionId: 'BRZ-BAH', country: 'Brazil', stateProvince: 'Bahia', district: 'Salvador', population: 2900000, populationDensity: 3900, ruralPopulation: 400000, urbanPopulation: 2500000, vulnerablePopulationIndicator: 55 },
  { regionId: 'BRZ-AMZ', country: 'Brazil', stateProvince: 'Amazonas', district: 'Manaus', population: 2200000, populationDensity: 160, ruralPopulation: 300000, urbanPopulation: 1900000, vulnerablePopulationIndicator: 60 },

  // --- Russia ---
  { regionId: 'RUS-MOW', country: 'Russia', stateProvince: 'Moscow', district: 'Moscow', population: 12600000, populationDensity: 4900, ruralPopulation: 100000, urbanPopulation: 12500000, vulnerablePopulationIndicator: 20 },
  { regionId: 'RUS-TAT', country: 'Russia', stateProvince: 'Tatarstan', district: 'Kazan', population: 1300000, populationDensity: 400, ruralPopulation: 200000, urbanPopulation: 1100000, vulnerablePopulationIndicator: 35 },
  { regionId: 'RUS-KRD', country: 'Russia', stateProvince: 'Krasnodar Krai', district: 'Krasnodar', population: 950000, populationDensity: 350, ruralPopulation: 250000, urbanPopulation: 700000, vulnerablePopulationIndicator: 40 },

  // --- China ---
  { regionId: 'CHN-GUA', country: 'China', stateProvince: 'Guangdong', district: 'Guangzhou', population: 18700000, populationDensity: 2200, ruralPopulation: 1200000, urbanPopulation: 17500000, vulnerablePopulationIndicator: 25 },
  { regionId: 'CHN-SIC', country: 'China', stateProvince: 'Sichuan', district: 'Chengdu', population: 16300000, populationDensity: 1000, ruralPopulation: 3000000, urbanPopulation: 13300000, vulnerablePopulationIndicator: 40 },
  { regionId: 'CHN-YUN', country: 'China', stateProvince: 'Yunnan', district: 'Kunming', population: 8500000, populationDensity: 220, ruralPopulation: 2500000, urbanPopulation: 6000000, vulnerablePopulationIndicator: 55 },

  // --- South Africa ---
  { regionId: 'ZAF-GAU', country: 'South Africa', stateProvince: 'Gauteng', district: 'Johannesburg', population: 5800000, populationDensity: 3000, ruralPopulation: 200000, urbanPopulation: 5600000, vulnerablePopulationIndicator: 45 },
  { regionId: 'ZAF-WC', country: 'South Africa', stateProvince: 'Western Cape', district: 'Cape Town', population: 4700000, populationDensity: 1600, ruralPopulation: 500000, urbanPopulation: 4200000, vulnerablePopulationIndicator: 38 },
  { regionId: 'ZAF-KZN', country: 'South Africa', stateProvince: 'KwaZulu-Natal', district: 'Durban', population: 3900000, populationDensity: 800, ruralPopulation: 1200000, urbanPopulation: 2700000, vulnerablePopulationIndicator: 58 },
];

const infrastructure = [
  { regionId: 'BRZ-SAO', roadConnectivityIndex: 72, healthcareAccessIndex: 68, educationAccessIndex: 70, waterAccessIndex: 75, electricityAccessIndex: 85, internetAccessIndex: 78, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },
  { regionId: 'BRZ-BAH', roadConnectivityIndex: 45, healthcareAccessIndex: 40, educationAccessIndex: 48, waterAccessIndex: 50, electricityAccessIndex: 60, internetAccessIndex: 42, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },
  { regionId: 'BRZ-AMZ', roadConnectivityIndex: 30, healthcareAccessIndex: 35, educationAccessIndex: 38, waterAccessIndex: 40, electricityAccessIndex: 50, internetAccessIndex: 28, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },

  { regionId: 'RUS-MOW', roadConnectivityIndex: 88, healthcareAccessIndex: 82, educationAccessIndex: 85, waterAccessIndex: 90, electricityAccessIndex: 95, internetAccessIndex: 88, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },
  { regionId: 'RUS-TAT', roadConnectivityIndex: 65, healthcareAccessIndex: 60, educationAccessIndex: 68, waterAccessIndex: 70, electricityAccessIndex: 80, internetAccessIndex: 62, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },
  { regionId: 'RUS-KRD', roadConnectivityIndex: 58, healthcareAccessIndex: 55, educationAccessIndex: 60, waterAccessIndex: 62, electricityAccessIndex: 72, internetAccessIndex: 55, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },

  { regionId: 'CHN-GUA', roadConnectivityIndex: 85, healthcareAccessIndex: 78, educationAccessIndex: 80, waterAccessIndex: 82, electricityAccessIndex: 92, internetAccessIndex: 85, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },
  { regionId: 'CHN-SIC', roadConnectivityIndex: 62, healthcareAccessIndex: 58, educationAccessIndex: 65, waterAccessIndex: 60, electricityAccessIndex: 75, internetAccessIndex: 60, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },
  { regionId: 'CHN-YUN', roadConnectivityIndex: 40, healthcareAccessIndex: 42, educationAccessIndex: 45, waterAccessIndex: 45, electricityAccessIndex: 58, internetAccessIndex: 38, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },

  { regionId: 'ZAF-GAU', roadConnectivityIndex: 60, healthcareAccessIndex: 55, educationAccessIndex: 58, waterAccessIndex: 55, electricityAccessIndex: 65, internetAccessIndex: 60, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },
  { regionId: 'ZAF-WC', roadConnectivityIndex: 68, healthcareAccessIndex: 62, educationAccessIndex: 65, waterAccessIndex: 65, electricityAccessIndex: 70, internetAccessIndex: 65, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },
  { regionId: 'ZAF-KZN', roadConnectivityIndex: 42, healthcareAccessIndex: 38, educationAccessIndex: 42, waterAccessIndex: 40, electricityAccessIndex: 50, internetAccessIndex: 38, dataYear: 2025, dataSource: 'CivicPulse Synthetic Demo Dataset' },
];

const investments = [
  { regionId: 'BRZ-SAO', sector: 'Healthcare', existingInvestment: 25000000, plannedInvestment: 8000000, projectCount: 4, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'BRZ-BAH', sector: 'Water & Sanitation', existingInvestment: 6000000, plannedInvestment: 2000000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },
  { regionId: 'BRZ-AMZ', sector: 'Roads & Transport', existingInvestment: 4000000, plannedInvestment: 1500000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },

  { regionId: 'RUS-MOW', sector: 'Internet & Digital Connectivity', existingInvestment: 30000000, plannedInvestment: 10000000, projectCount: 5, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'RUS-TAT', sector: 'Education', existingInvestment: 12000000, plannedInvestment: 4000000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'RUS-KRD', sector: 'Electricity', existingInvestment: 9000000, plannedInvestment: 3000000, projectCount: 2, projectStatus: 'Planned', financialYear: '2025-2026' },

  { regionId: 'CHN-GUA', sector: 'Roads & Transport', existingInvestment: 40000000, plannedInvestment: 15000000, projectCount: 6, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'CHN-SIC', sector: 'Healthcare', existingInvestment: 15000000, plannedInvestment: 5000000, projectCount: 3, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'CHN-YUN', sector: 'Water & Sanitation', existingInvestment: 5000000, plannedInvestment: 1800000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },

  { regionId: 'ZAF-GAU', sector: 'Electricity', existingInvestment: 11000000, plannedInvestment: 3500000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'ZAF-WC', sector: 'Internet & Digital Connectivity', existingInvestment: 8000000, plannedInvestment: 2500000, projectCount: 2, projectStatus: 'Planned', financialYear: '2025-2026' },
  { regionId: 'ZAF-KZN', sector: 'Water & Sanitation', existingInvestment: 4500000, plannedInvestment: 1200000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },
];

module.exports = { demographics, infrastructure, investments };