#!/usr/bin/env python3

import os

GEOCODER_URL = 'http://maps.googleapis.com/maps/api/geocode/json'
GEOCODER_NUM_REQUESTS_PER_DAY = 2500
STATUS_FILENAME = os.path.dirname(__file__) + '/geocoder-status.txt'
DSN='dbname=bikefile user=bikefile password=bikefile host=localhost'

DB_SCHEMAS = {
    'vancouver': (
        ('Time', 'TIMESTAMP', 'NOT NULL'),
        ('Address', 'VARCHAR', 'NOT NULL'),
        ('Fatal', 'BOOLEAN', 'NOT NULL'),
        ('Latitude', 'FLOAT'),
        ('Longitude', 'FLOAT')
    ),
    'calgary': (
        ('Time', 'TIMESTAMP', 'NOT NULL'),
        ('Address', 'VARCHAR', 'NOT NULL'),
        ('Injury level', 'VARCHAR'),
        ('Age', 'INT'),
        ('Sex', 'CHAR(1)'),
        ('Safety equipment', 'VARCHAR'),
        ('Primary event', 'VARCHAR'),
        ('Severity', 'VARCHAR'),
        ('Latitude', 'FLOAT'),
        ('Longitude', 'FLOAT')
    ),
    'toronto': (
        ('Time', 'TIMESTAMP', 'NOT NULL'),
        ('Address', 'VARCHAR', 'NOT NULL'),
        ('Injury', 'VARCHAR'),
        ('Safety equipment', 'VARCHAR'),
        ('Road class', 'VARCHAR'),
        ('Crash type', 'VARCHAR'),
        ('Age', 'INT'),
        ('Traffic control', 'VARCHAR'),
        ('Road surface', 'VARCHAR'),
        ('Driver action', 'VARCHAR'),
        ('Driver condition', 'VARCHAR'),
        ('Latitude', 'FLOAT'),
        ('Longitude', 'FLOAT')
    ),
    'ottawa': (
        ('id', 'INT', 'NOT NULL'),
        ('Time', 'TIMESTAMP', 'NOT NULL'),
        ('Address', 'VARCHAR', 'NOT NULL'),
        ('Impact type', 'VARCHAR'),
        ('Environment', 'VARCHAR'),
        ('Light', 'VARCHAR'),
        ('Traffic control', 'VARCHAR'),
        ('Severity', 'VARCHAR'),
        ('Number of vehicles', 'INT'),
        ('Number of injured persons', 'INT'),
        ('Number of pedestrians', 'INT'),
        ('Latitude', 'FLOAT'),
        ('Longitude', 'FLOAT')
    ),
    'montreal': (
        ('Time', 'TIMESTAMP', 'NOT NULL'),
        ('Address', 'VARCHAR', 'NOT NULL'),
        ('Latitude', 'FLOAT'),
        ('Longitude', 'FLOAT')
    ),
    'halifax': (
        ('Time', 'TIMESTAMP', 'NOT NULL'),
        ('Age', 'INT'),
        ('Gender', 'VARCHAR', 'NOT NULL'),
        ('Injury', 'VARCHAR', 'NOT NULL'),
        ('Road condition', 'VARCHAR', 'NOT NULL'),
        ('Weather condition', 'VARCHAR', 'NOT NULL'),
        ('Community', 'VARCHAR', 'NOT NULL'),
        ('Charge', 'VARCHAR', 'NOT NULL'),
        ('Address', 'VARCHAR', 'NOT NULL'),
        ('Latitude', 'FLOAT'),
        ('Longitude', 'FLOAT')
    )
}

from csv_file import CsvFile as _CsvFile
from db import Db as _Db
from db_table import DbTable as _DbTable
from geocoder import Geocoder as _Geocoder
from geocoder_status import GeocoderStatus as _GeocoderStatus

class Importer:
    def __init__(self, csvfile, dbSchema, dsn, geocoderUrl, geocoderStatusFile, geocoderNumRequestsPerDay, logger=None):
        self.logger = logger

        self.db = _Db(dsn, logger)
        self.dbTable = _DbTable(self.db, dbSchema, self.logger)
        self.csv = _CsvFile(csvfile, logger)
        self.geocoderStatus = _GeocoderStatus(geocoderStatusFile, logger, requestsPerDay=geocoderNumRequestsPerDay)
        self.geocoder = _Geocoder(geocoderUrl, self.geocoderStatus, logger)

    def run(self):
        self.dbTable.createIfNotExists()

        for row in self.csv.geocodedNewRows(self.dbTable, self.geocoder):
            self.dbTable.insertRow(row)

        self.dbTable.createSpatialIndex()

if __name__ == '__main__':
    import sys
    from logger import Logger
    from db_table import DbSchemaRow, DbSchemaTable

    logger = Logger(sys.stdout)

    csvfile = sys.argv[1]
    city = csvfile.split('/')[-1].split('.')[0]

    logger.info("File: %s; city: %s" % (csvfile, city))

    schema = DB_SCHEMAS[city]
    dbSchema = DbSchemaTable(city, [ DbSchemaRow(*r) for r in schema ])

    logger.info("Schema: %r" % (schema,))

    importer = Importer(csvfile, dbSchema, DSN, GEOCODER_URL, STATUS_FILENAME, GEOCODER_NUM_REQUESTS_PER_DAY, logger=logger)
    importer.run()
