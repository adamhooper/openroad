#!/usr/bin/env python3

from importer import DSN, DB_SCHEMAS

from csv import DictWriter as _CsvWriter
from db import Db as _Db
from db_table import DbTable as _DbTable

class Exporter:
    def __init__(self, outfile, dbSchema, dsn, logger=None):
        self.logger = logger

        self.outfile = outfile
        self.db = _Db(dsn, logger)
        self.dbTable = _DbTable(self.db, dbSchema, self.logger)

    def run(self):
        keys = [ row.name for row in self.dbTable.schema.rows ]
        keys = keys[0:-2] + [ 'LatLng' ] # don't include Latitude, Longitude
        if keys[0] != 'id': keys = [ 'id' ] + keys

        if self.logger: logger.info("Columns: %r" % (keys,))

        csv = _CsvWriter(self.outfile, keys, extrasaction='ignore')
        csv.writerow(dict(zip(keys, keys))) # Header row
        for row in self.dbTable.fetchAllRows():
            row['LatLng'] = "%f,%f" % (row['Latitude'], row['Longitude'])
            csv.writerow(row)

if __name__ == '__main__':
    import sys
    from logger import Logger
    from db_table import DbSchemaRow, DbSchemaTable

    logger = Logger(sys.stdout)

    csvfile = open(sys.argv[1], 'w')
    city = sys.argv[1].split('/')[-1].split('.')[0]

    logger.info("File: %s; city: %s" % (sys.argv[1], city))

    schema = DB_SCHEMAS[city]
    dbSchema = DbSchemaTable(city, [ DbSchemaRow(*r) for r in schema ])

    logger.info("Schema: %r" % (schema,))

    exporter = Exporter(csvfile, dbSchema, DSN, logger)
    exporter.run()
