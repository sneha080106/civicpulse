const { COUNTRIES, DEFAULT_COUNTRY_CODE } = require('../config/countries');

const getCountries = (req, res) => {
  res.status(200).json({ success: true, defaultCountry: DEFAULT_COUNTRY_CODE, countries: COUNTRIES });
};

module.exports = { getCountries };