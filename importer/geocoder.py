#!/usr/bin/env python3

from urllib.request import urlopen as _urlopen
from urllib.parse import urlencode as _urlencode
import json as _json

class GeocoderException(Exception):
    pass

class GeocoderFatalException(Exception):
    pass

class Geocoder:
    def __init__(self, url, status, logger=None):
        self.url = url
        self.status = status
        self.logger = logger

    def geocode(self, address):
        if self.status.remainingQuota == 0:
            raise GeocoderFatalException("Today's quota has been depleted.")

        url = '%s?%s' % (self.url, _urlencode({'sensor': 'false', 'address': address}))

        if self.logger: self.logger.info('GET: %s' % (url,))

        responseFile = _urlopen(url)

        self.status.decrementQuota()

        responseJson = responseFile.read().decode('utf-8')
        response = _json.loads(responseJson)

        if response['status'] == 'ZERO_RESULTS': return (None, None)

        if self.logger: self.logger.info('Status: %s' % (response['status'],))
        assert(response['status'] == 'OK')
        assert(len(response['results']) > 0)

        result = response['results'][0]
        geometry = result['geometry']
        location = geometry['location']
        latitude = location['lat']
        longitude = location['lng']

        if self.logger: self.logger.info('Geocoded "%s" to (%f,%f)' % (address, latitude, longitude))

        return (latitude, longitude)
