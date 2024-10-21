const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Global Index API',
    version: '1.0.0',
    description: 'API to access global country records.',
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 5000}`,
      description: 'Local server',
    },
  ],
};

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./api/index.js'],
};

module.exports = require('swagger-jsdoc')(swaggerOptions);