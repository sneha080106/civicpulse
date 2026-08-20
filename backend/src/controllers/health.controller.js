const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CivicPulse API is running',
    timestamp: new Date().toISOString(),
  });
};

module.exports = { getHealth };