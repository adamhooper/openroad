#!/usr/bin/env python3

import csv as _csv

class CsvFile:
    def __init__(self, file, logger=None):
        if not hasattr(file, 'next'): file = open(file, encoding='utf-8')

        self.logger = logger
        self.csv = _csv.DictReader(file)

    def geocodedNewRows(self, dbTable, geocoder):
        for row in self.newRows(dbTable):
            if 'Latitude' not in row or 'Longitude' not in row:
                if self.logger: self.logger.info('Geocoding %s...' % (row['Address'],))
                latitude, longitude = geocoder.geocode(row['Address'])
                row['Latitude'] = latitude
                row['Longitude'] = longitude
            yield row

    def newRows(self, dbTable):
        for row in self.rows():
            existingRow = dbTable.fetchExistingRowWithData(row)
            if not existingRow:
                yield row

    def rows(self):
        for row in self.csv:
            yield row
