const axios = require('axios');

describe('Health Check Tests', () => {
  const BASE_URL = process.env.API_URL || 'http://localhost:3000';
  
  test('API Gateway should be accessible', async () => {
    const response = await axios.get(`${BASE_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('healthy');
  });

  test('Database connection should work', async () => {
    const response = await axios.get(`${BASE_URL}/health/db`);
    expect(response.status).toBe(200);
    expect(response.data.database).toBe('connected');
  });

  test('Redis connection should work', async () => {
    const response = await axios.get(`${BASE_URL}/health/redis`);
    expect(response.status).toBe(200);
    expect(response.data.redis).toBe('connected');
  });
});
