import psycopg2
from dotenv import load_dotenv
import os
import wbgapi as wb

print(wb.series.info("EP.PMP.SGAS.CD").table()[0][1])
load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    database=os.getenv("DATABASE_NAME"),  
    user=os.getenv("DB_USERNAME"),
    password=os.getenv("DB_PASSWORD"),
)

cursor = conn.cursor()
cursor.execute("""CREATE TABLE IF NOT EXISTS dummytable (
                id INT PRIMARY KEY,
               name VARCHAR(255)
               );""")
cursor.execute("""INSERT INTO dummytable (id, name) VALUES 
               (6,'Goku');
               """)
cursor.execute("SELECT current_database();")
print("Connected to:", cursor.fetchone()[0])

cursor.execute("SELECT * FROM dummytable;")

print("Available Databases:")
for row in cursor.fetchall():
    print(row)

conn.commit()

cursor.close()
conn.close()
