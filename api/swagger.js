const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    info: {
      title: 'Global Index API',
      version: '1.0.0',
      description: 'API documentation for the Global Index WebApp',
    }
  },
  apis: ['index.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

module.exports = {
  swaggerDocs,
};
