const dotenv = require('dotenv');
dotenv.config();

const express = require("express");
const swaggerDocs = require('./swagger');
const swaggerUi = require('swagger-ui-express');
const { spawn } = require('child_process');
const cron = require('node-cron');

const app = express();
app.use(express.json());
const port = process.env.PORT;
const dbName = 'global-index';
const collectionName = 'countries';

async function connectToDb() {
    const client = new MongoClient(process.env.API_PORT);
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to database');
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
  res.send('Records Accessed');
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
  res.send('Records Params Accessed');
});

connectToDb().then(() => {
  console.log('Connected to MongoDB');
  app.listen(port, '0.0.0.0',() => {
      console.log(`Server has started on port ${port}`);
  });
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
});

//Update DB Scripts
function updateDB() {
  const python = spawn("python", ["scripts/populate_db.py"]);
  
  console.log("Update DB Script Called");

  python.stdout.on("data", (data) => {
    console.log(`Script Output: ${data.toString()}`);
  });

  python.stderr.on("data", (data) => {
    console.error(`Error: ${data.toString()}`);
  });

  python.on("close", (code) => {
    console.log(`Script finished!`);
  });

}

cron.schedule('0 0 1 1 *', updateDB);
