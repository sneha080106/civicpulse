require('dotenv').config();

const requiredVars = ['PORT', 'MONGODB_URI'];

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const AI_MOCK_MODE = process.env.AI_MOCK_MODE !== 'false';
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173']; //step 16
module.exports = {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  LLM_API_KEY: process.env.LLM_API_KEY || '',
  LLM_MODEL: process.env.LLM_MODEL || '',
  AI_MOCK_MODE,
  CORS_ORIGIN,
};