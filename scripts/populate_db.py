import os
import pandas as pd
import wbgapi as wb
from pymongo import MongoClient
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()

def read_indicators_from_file(file_path):
    with open(file_path, 'r') as f:
        indicators = f.read().splitlines()
    
    return indicators

def get_indicator_data(country, indicators):
    current_document = {'country':country, 'indicators':[]}
    for indicator in indicators:                                                                             
        try:
            current_document['indicators'].append({indicator:wb.data.get(indicator, country, mrnev=1)['value']})
        except Exception as e:
            if str(e) == 'APIError':
                current_document['indicators'].append({indicator:wb.data.get(indicator, country)['value']})
    return current_document

def populate(indicators):
    countries = [country['id'] for country in wb.economy.list()]
    data = []

    print("Gathering Country Data...")
    for country in tqdm(countries):
        cur = get_indicator_data(country, indicators)
        data.append(cur)
    print("Data Gathered!")

    mongodb_url = os.getenv('MONGODB_URL')
    port = int(os.getenv('PORT'))
    
    try:
        print("Inserting Data...")
        client = MongoClient(mongodb_url,port)
        db = client['global-index']
        table = db['countries']
        table.insert_many(data)
        print("Data has been successfully inserted into MongoDB!")
    except Exception as e:
        print(e)
        return
    
    print("Completed!")
    return

def main():
    print('Populating database...')
    indicators = read_indicators_from_file('scripts/indicators.txt')
    populate(indicators)
    return

if __name__ =='__main__':
    main()
