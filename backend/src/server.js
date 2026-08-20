const { PORT } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`CivicPulse API running at http://localhost:${PORT}`);
  });
};

startServer();