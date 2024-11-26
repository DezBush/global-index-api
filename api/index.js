const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const express = require("express");
const cors = require("cors");
const swaggerDocs = require('./swagger');
const swaggerUi = require('swagger-ui-express');
const { spawn } = require('child_process');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.API_PORT || 5000;

const dbFilePath = path.resolve(__dirname, 'databank.db');

const db = new sqlite3.Database(dbFilePath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

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
  const message = 
    `Hello from the Global Index API!
    - If you would like to see records, go to /records
    - For individual country info for all indicators, go to /records/country/{countryId}
    - For individual indicator info for all countries, go to /records/indicator/{indicatorCode}
    - For specific country and ID records, go to /records/country/{countryId}/{indicatorCode}
    - For full documentation and testing, go to /api-docs`
  res.setHeader('Content-Type', 'text/plain');
  res.send(message);
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
  const query = 'SELECT * FROM databank';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching records:', err.message);
      return res.status(500).json({ error: 'Error fetching records' });
    }
    res.status(200).json(rows);
  });
});

/**
 * @swagger
 * /records/country/{countryId}:
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
  const query = 'SELECT * FROM databank WHERE country_code = ?';
  db.all(query, [countryId], (err, rows) => {
    if (err) {
      console.error('Error fetching record:', err.message);
      return res.status(500).json({ error: 'Error fetching record' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(200).json(rows);
  });
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
  const query = 'SELECT * FROM databank WHERE indicator_code = ?';
  db.all(query, [indicatorCode], (err, rows) => {
    if (err) {
      console.error('Error fetching indicator:', err.message);
      return res.status(500).json({ error: 'Error fetching indicator' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Indicator not found' });
    }
    res.status(200).json(rows);
  });
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
  const query = 'SELECT * FROM databank WHERE country_code = ? AND indicator_code = ?';
  db.all(query, [countryId, indicatorCode], (err, rows) => {
    if (err) {
      console.error('Error fetching record:', err.message);
      return res.status(500).json({ error: 'Error fetching record' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.status(200).json(rows);
  });
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

updateDB();

// Runs every year
cron.schedule('0 0 1 1 *', updateDB);

// Start Server
app.listen(port, () => {
  console.log(`Server has started on port ${port}`);
});
