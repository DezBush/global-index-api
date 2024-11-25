const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const express = require("express");
const cors = require("cors");
const swaggerDocs = require('./swagger');
const swaggerUi = require('swagger-ui-express');
const { spawn } = require('child_process');
const cron = require('node-cron');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.API_PORT || 5000;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DATABASE_NAME,
});

async function connectToDb() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL database');
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
    process.exit(1);
  }
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /:
 *   get:
 *     description: Welcome message
 *     responses:
 *       200:
 *         description: Returns a welcome message
 */
app.get('/', (req,res) => {
    res.send("Hello from the Global Index API! If you would like to see records, go to /records.");
});

/**
 * @swagger
 * /records:
 *   get:
 *     summary: Get all country records
 *     responses:
 *       200:
 *         description: Returns records for the specified country
 *       404:
 *         description: Error displaying records
 *       500:
 *         description: Error fetching records
 */
app.get('/records', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM databank');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Error fetching records' });
  }
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
app.get('/records/country/:countryId', async (req, res) => {
  const { countryId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM databank WHERE country_code = $1',
      [countryId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: 'Error fetching record' });
  }
});

/**
 * @swagger
 * /records/indicator/{indicatorCode}:
 *   get:
 *     summary: Get records by indicator code
 *     parameters:
 *       - in: path
 *         name: indicatorCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The code for the indicator
 *     responses:
 *       200:
 *         description: Returns all records with the specified indicator code
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   indicator_code:
 *                     type: string
 *                     description: The indicator code
 *                   value:
 *                     type: number
 *                     description: The value of the indicator
 *                   year:
 *                     type: integer
 *                     description: The year of the record
 *       404:
 *         description: Indicator not found
 *       500:
 *         description: Error fetching the indicator records
 */
app.get('/records/indicator/:indicatorCode', async (req, res) => {
  const { indicatorCode } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM databank WHERE indicator_code = $1',
      [indicatorCode]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Indicator not found' });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching indicator:', error);
    res.status(500).json({ error: 'Error fetching indicator' });
  }
});

/**
 * @swagger
 * /records/country/{countryId}/{indicatorCode}:
 *   get:
 *     summary: Get a specific indicator value for a country
 *     parameters:
 *       - in: path
 *         name: countryId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the country
 *       - in: path
 *         name: indicatorCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The code for the specific indicator
 *     responses:
 *       200:
 *         description: Returns the indicator value for the country
 *       404:
 *         description: Indicator not found for the country
 *       500:
 *         description: Error fetching the indicator value
 */
app.get('/records/country/:countryId/:indicatorCode', async (req, res) => {
  const { countryId, indicatorCode } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM databank WHERE country_code = $1 AND indicator_code = $2',
      [countryId, indicatorCode]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: 'Error fetching record' });
  }
});

// Update DB Script
function updateDB() {
  const scriptPath = path.join(__dirname, "scripts/populate_db.py");
  const python = spawn("python", [scriptPath]);

  console.log("Update DB Script Called");

  python.stdout.on("data", (data) => {
    console.log(`Script Output: ${data.toString()}`);
  });

  python.stderr.on("data", (data) => {
    console.error(`Error: ${data.toString()}`);
  });

  python.on("close", (code) => {
    if (code === 0) {
      console.log("Script finished successfully!");
    } else {
      console.error(`Script finished with code: ${code}`);
    }
  });
}

// Runs every year
cron.schedule('0 0 1 1 *', updateDB);

// Start Server
connectToDb()
  .then(() => {
    updateDB();
    app.listen(port, 'localhost', () => {
      console.log(`Server has started on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Error initializing server:', error);
  });
