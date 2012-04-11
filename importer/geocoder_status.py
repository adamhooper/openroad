#!/usr/bin/env python3

from datetime import datetime as _datetime

"""
Maintains state, across invocations, so we don't exceed our quota.

The Google Maps API only lets us geocode a certain number of addresses per
day. This class makes sure we don't go over our limit, so Google doesn't
ban us.

It stores state in the file passed by the "filename" parameter. If the file
does not exist, this object will create it.
"""
class GeocoderStatus:
    def __init__(self, filename, logger=None, requestsPerDay=-1):
        self.logger = logger

        self._statusFile = open(filename, 'a+b')
        self._statusFile.seek(0)

        s = self._statusFile.read().decode('ascii')

        self._todayDateString = _datetime.utcnow().strftime('%Y-%m-%d')

        self.remainingQuota = requestsPerDay

        if len(s):
            dateString, remainingQuotaString = s.split()
            if dateString == self._todayDateString:
                self.remainingQuota = int(remainingQuotaString)
                if logger: logger.info('Remaining quota for %s: %d' % (self._todayDateString, self.remainingQuota))
            else:
                if logger: logger.info('Quota for new day (%s): %d' % (self._todayDateString, self.remainingQuota))
        else:
            if logger: logger.info('Quota for %s: %d' % (self._todayDateString, self.remainingQuota))

    def decrementQuota(self):
        self.remainingQuota -= 1
        self._statusFile.seek(0)
        self._statusFile.truncate()
        self._statusFile.write(('%s %d' % (self._todayDateString, self.remainingQuota)).encode('ascii'))
        self._statusFile.flush()
        if self.logger: self.logger.info('Remaining quota for %s: %d' % (self._todayDateString, self.remainingQuota))
