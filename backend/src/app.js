const express = require('express');
const cors = require('cors');
require('./models');
const { CORS_ORIGIN } = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const requestRoutes = require('./routes/request.routes');
const citizenRequestRoutes = require('./routes/citizenRequest.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const priorityRoutes = require('./routes/priority.routes');
const regionRoutes = require('./routes/region.routes');
const errorMiddleware = require('./middleware/error.middleware');
const countryRoutes = require('./routes/country.routes');
const countryDataRoutes = require('./routes/countryData.routes');

const app = express();

app.use(express.json());
app.use(cors({origin: CORS_ORIGIN }));

app.use('/api/health', healthRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/citizen-requests', citizenRequestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/priorities', priorityRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/country-data', countryDataRoutes);

app.use(errorMiddleware);

module.exports = app;