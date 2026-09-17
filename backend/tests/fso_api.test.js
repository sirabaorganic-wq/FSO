/**
 * FSO API Routes Smoke & Integration Tests
 */

const request = require('supertest');
const express = require('express');

// Create mock app with FSO route handlers
const articleRoutes = require('../routes/articleRoutes');
const recipeRoutes = require('../routes/recipeRoutes');
const ingredientRoutes = require('../routes/ingredientRoutes');
const collectionRoutes = require('../routes/collectionRoutes');
const bannerRoutes = require('../routes/bannerRoutes');
const producerRoutes = require('../routes/producerRoutes');
const searchRoutes = require('../routes/searchRoutes');

describe('FSO Routes Mounting & Schema Integrity', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/articles', articleRoutes);
    app.use('/api/v1/recipes', recipeRoutes);
    app.use('/api/v1/ingredients', ingredientRoutes);
    app.use('/api/v1/collections', collectionRoutes);
    app.use('/api/v1/banners', bannerRoutes);
    app.use('/api/v1/producers', producerRoutes);
    app.use('/api/v1/search', searchRoutes);
  });

  it('mounts all FSO v1 route routers without crashing', () => {
    expect(articleRoutes).toBeDefined();
    expect(recipeRoutes).toBeDefined();
    expect(ingredientRoutes).toBeDefined();
    expect(collectionRoutes).toBeDefined();
    expect(bannerRoutes).toBeDefined();
    expect(producerRoutes).toBeDefined();
    expect(searchRoutes).toBeDefined();
  });

  it('GET /api/v1/search with empty query returns structured empty response', async () => {
    const res = await request(app).get('/api/v1/search');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.query).toBe('');
    expect(res.body.data.counts.total).toBe(0);
    expect(Array.isArray(res.body.data.results.products)).toBe(true);
    expect(Array.isArray(res.body.data.results.producers)).toBe(true);
  });
});
