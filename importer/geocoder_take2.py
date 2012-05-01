#!/usr/bin/env python3

import importer as _importer
from db import Db as _Db

if __name__ == '__main__':
    import sys
    from logger import Logger
    from geocoder import Geocoder as _Geocoder
    from geocoder_status import GeocoderStatus as _GeocoderStatus

    logger = Logger(sys.stdout)

    correction_file = sys.argv[1]
    city = correction_file.split('/')[-1].split('-')[0]

    logger.info("File: %s; city: %s" % (correction_file, city))
    db = _Db(_importer.DSN, logger)
    c = db.cursor()

    geocoderStatus = _GeocoderStatus(_importer.STATUS_FILENAME, logger, requestsPerDay=_importer.GEOCODER_NUM_REQUESTS_PER_DAY)
    geocoder = _Geocoder(_importer.GEOCODER_URL, geocoderStatus, logger)

    f = open(correction_file)
    for i, line in enumerate(f.readlines()):
        if len(line.strip()) == 0: continue
        (bad, good) = map(str.strip, line.split('--'))
        if good == 'DELETE':
            latitude, longitude = (0.0, 0.0)
        else:
            if logger: logger.info('Geocoding %s...' % (good,))
            latitude, longitude = geocoder.geocode(good)
        sql = 'UPDATE "%s" SET "Latitude" = %%s, "Longitude" = %%s, "Location" = ST_SetSRID(ST_MakePoint(%%s, %%s), 4326) WHERE "Address" = %%s' % (city,)
        params = (latitude, longitude, longitude, latitude, bad)
        if logger: logger.info('%r, %r' % (sql, params))
        c.execute(sql, params)

    if logger: logger.info('Commit')
    db.commit()

    if logger: logger.info('Vacuum')
    db.vacuum(city)
