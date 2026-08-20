// Shared sequential ID generator (CR001, CR002, ...) used by BOTH citizen
// submission paths (POST /api/requests and POST /api/citizen-requests) since
// they write to the same CitizenRequest collection. Centralized here so the
// two controllers can never generate colliding IDs independently.
const generateRequestId = async (CitizenRequest) => {
  const count = await CitizenRequest.countDocuments();
  return `CR${String(count + 1).padStart(3, '0')}`;
};

module.exports = { generateRequestId };