const dotenv = require('dotenv');
dotenv.config();

const express = require("express");
const axios = require("axios")
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const { swaggerUi, specs } = require('./swagger');

const app = express();
app.use(express.json());
const port = process.env.PORT;
const dbName = 'global-index';
const collectionName = 'countries';

async function connectToDb() {
    const client = new MongoClient(process.env.MONGODB_URL);
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to database');
  }

connectToDb().then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, '0.0.0.0',() => {
        console.log("Server has started")
    });
})
.catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome message
 *     responses:
 *       200:
 *         description: Returns a welcome message
 */
app.get('/', (req,res) => {
    res.send("Hello from global index WebApp");
});

/**
 * @swagger
 * /records/{countryId}:
 *   get:
 *     summary: Get records by country ID
 *     parameters:
 *       - in: path
 *         name: countryId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the country
 *     responses:
 *       200:
 *         description: Returns records for the specified country
 *       404:
 *         description: Record not found
 *       500:
 *         description: Error fetching records
 */
app.get('/records/:countryId', async (req, res) => {
    const collection = db.collection(collectionName);
    const countryId = req.params.countryId;
    try {
      const records = await collection.find({country: countryId}).toArray();
      if (!records || records.length === 0) {
        return res.status(404).json({ message: 'Record not found' });
      }
      res.json(records);
    } catch (error) {
      console.error('Error fetching records:', error);
      res.status(500).send('Error fetching records');
    }
  });
