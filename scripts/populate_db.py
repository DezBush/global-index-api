import os
import pandas as pd
import wbgapi as wb
import psycopg2
from dotenv import load_dotenv
from tqdm import tqdm


def read_indicators_from_file(file_path):
    with open(file_path, 'r') as f:
        indicators = f.read().splitlines()
    
    return indicators


def populate(indicators):
    data = pd.DataFrame(columns=[])
    country_info = wb.economy.DataFrame(skipAggs=True).reset_index()
    countries = country_info[['id', 'name', 'capitalCity']]
    result = []

    print("Gathering Data...")
    for indicator in tqdm(indicators):
        data = wb.data.DataFrame(indicator, economy=countries['id'].tolist(), timeColumns=True, mrnev=1).reset_index()
        data = data.rename(columns={"economy": "id", indicator: "indicator_value", f"{indicator}:T":"year", "name":"country_name", "capitalCity":"capital_city"})
        data['indicator_code'] = indicator
        data['indicator_name'] = wb.series.info(indicator).table()[0][1]
        result.append(data)

    indicator_data_df = pd.concat(result, ignore_index=True)
    final_table = pd.merge(indicator_data_df, country_info, how="outer", on="id")
    final_table = final_table.drop(columns=['aggregate','longitude','latitude','region','adminregion','lendingType','incomeLevel'])
    final_table = final_table.rename(columns={'id':'country_code', 'indicator_value':'value', 'name':'country_name', "capitalCity":"capital_city"})

    print("Inserting Data...")
    load_dotenv()
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        database=os.getenv("DATABASE_NAME"),  
        user=os.getenv("DB_USERNAME"),
        password=os.getenv("DB_PASSWORD"),
    )
    cursor = conn.cursor()
    
    try:
        cursor.execute("DROP TABLE IF EXISTS databank")
        conn.commit()

        create_table_query = '''
        CREATE TABLE IF NOT EXISTS databank (
            id SERIAL PRIMARY KEY,
            country_code VARCHAR(5),
            country_name VARCHAR(100),
            capital_city VARCHAR(100),
            indicator_code VARCHAR(50),
            indicator_name VARCHAR(200),
            year INT,
            value DECIMAL
        );
        '''

        cursor.execute(create_table_query)
        conn.commit()

        insert_query = '''
        INSERT INTO databank (
            country_code, country_name, capital_city,
            indicator_code, indicator_name, year, value
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        '''

        for _, row in tqdm(final_table.iterrows()):
            cursor.execute(insert_query, (
                row['country_code'], row['country_name'], row['capital_city'], 
                row['indicator_code'], row['indicator_name'], 
                row['year'], row['value']
            ))
        conn.commit()
        print("Data has been successfully inserted!")
    except Exception as e:
        print(f"An error has occured: {e}")
        conn.rollback()
        return
    finally:
        cursor.close()
        conn.close()
        return


def main():
    indicators = read_indicators_from_file('scripts/indicators.txt')
    populate(indicators)
    return


if __name__ =='__main__':
    main()
