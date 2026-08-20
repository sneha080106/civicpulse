// SYNTHETIC DEMO DATA ONLY. These are fictional prototype figures used
// to demonstrate the RELATIVE investment gap calculation — they must
// NEVER be presented as real government budget allocations.

const investments = [
  // Ranchi — deliberately under-invested in Healthcare (drives high priority)
  { regionId: 'JH-RAN', sector: 'Healthcare', existingInvestment: 8000000, plannedInvestment: 2000000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'JH-RAN', sector: 'Roads & Transport', existingInvestment: 15000000, plannedInvestment: 5000000, projectCount: 4, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'JH-RAN', sector: 'Water & Sanitation', existingInvestment: 6000000, plannedInvestment: 1000000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },

  // Jamshedpur — well invested (drives low priority)
  { regionId: 'JH-JSR', sector: 'Roads & Transport', existingInvestment: 25000000, plannedInvestment: 10000000, projectCount: 5, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'JH-JSR', sector: 'Education', existingInvestment: 18000000, plannedInvestment: 6000000, projectCount: 3, projectStatus: 'Completed', financialYear: '2025-2026' },
  { regionId: 'JH-JSR', sector: 'Internet & Digital Connectivity', existingInvestment: 12000000, plannedInvestment: 4000000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },

  // Dhanbad — moderate
  { regionId: 'JH-DHN', sector: 'Healthcare', existingInvestment: 10000000, plannedInvestment: 3000000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'JH-DHN', sector: 'Electricity', existingInvestment: 14000000, plannedInvestment: 4000000, projectCount: 3, projectStatus: 'Planned', financialYear: '2025-2026' },
  { regionId: 'JH-DHN', sector: 'Roads & Transport', existingInvestment: 11000000, plannedInvestment: 3500000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },

  // Gaya — low investment, poor infra, high demand (high priority candidate)
  { regionId: 'BR-GAY', sector: 'Healthcare', existingInvestment: 5000000, plannedInvestment: 1500000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },
  { regionId: 'BR-GAY', sector: 'Water & Sanitation', existingInvestment: 4500000, plannedInvestment: 1000000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },
  { regionId: 'BR-GAY', sector: 'Roads & Transport', existingInvestment: 7000000, plannedInvestment: 2000000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },

  // Muzaffarpur — moderate-low
  { regionId: 'BR-MUZ', sector: 'Water & Sanitation', existingInvestment: 5500000, plannedInvestment: 1200000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },
  { regionId: 'BR-MUZ', sector: 'Healthcare', existingInvestment: 6000000, plannedInvestment: 1500000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'BR-MUZ', sector: 'Electricity', existingInvestment: 8000000, plannedInvestment: 2000000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },

  // Kolkata — heavily invested (low priority candidate)
  { regionId: 'WB-KOL', sector: 'Internet & Digital Connectivity', existingInvestment: 30000000, plannedInvestment: 10000000, projectCount: 6, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'WB-KOL', sector: 'Education', existingInvestment: 28000000, plannedInvestment: 9000000, projectCount: 5, projectStatus: 'Completed', financialYear: '2025-2026' },
  { regionId: 'WB-KOL', sector: 'Roads & Transport', existingInvestment: 35000000, plannedInvestment: 12000000, projectCount: 7, projectStatus: 'Ongoing', financialYear: '2025-2026' },

  // Siliguri — moderate
  { regionId: 'WB-SIL', sector: 'Roads & Transport', existingInvestment: 12000000, plannedInvestment: 4000000, projectCount: 3, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'WB-SIL', sector: 'Healthcare', existingInvestment: 9000000, plannedInvestment: 3000000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'WB-SIL', sector: 'Internet & Digital Connectivity', existingInvestment: 7000000, plannedInvestment: 2000000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },

  // Purulia — lowest investment, weakest infra, high demand (obvious high-priority candidate)
  { regionId: 'WB-PUR', sector: 'Water & Sanitation', existingInvestment: 3000000, plannedInvestment: 800000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },
  { regionId: 'WB-PUR', sector: 'Healthcare', existingInvestment: 3500000, plannedInvestment: 1000000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },
  { regionId: 'WB-PUR', sector: 'Electricity', existingInvestment: 4000000, plannedInvestment: 1200000, projectCount: 1, projectStatus: 'Planned', financialYear: '2025-2026' },

  // Bhubaneswar — well invested (low priority candidate)
  { regionId: 'OD-BBS', sector: 'Education', existingInvestment: 20000000, plannedInvestment: 7000000, projectCount: 4, projectStatus: 'Completed', financialYear: '2025-2026' },
  { regionId: 'OD-BBS', sector: 'Internet & Digital Connectivity', existingInvestment: 18000000, plannedInvestment: 6000000, projectCount: 3, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'OD-BBS', sector: 'Electricity', existingInvestment: 22000000, plannedInvestment: 7500000, projectCount: 4, projectStatus: 'Completed', financialYear: '2025-2026' },

  // Cuttack — moderate
  { regionId: 'OD-CTC', sector: 'Roads & Transport', existingInvestment: 13000000, plannedInvestment: 4500000, projectCount: 3, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'OD-CTC', sector: 'Water & Sanitation', existingInvestment: 9000000, plannedInvestment: 3000000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },
  { regionId: 'OD-CTC', sector: 'Education', existingInvestment: 11000000, plannedInvestment: 3500000, projectCount: 2, projectStatus: 'Ongoing', financialYear: '2025-2026' },
];

module.exports = investments;