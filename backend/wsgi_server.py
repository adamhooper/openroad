#!/usr/bin/env python3

import cgi
import json
import re

CITIES = [ 'montreal', 'toronto', 'calgary', 'vancouver', 'ottawa', 'halifax' ]
DSN = 'dbname=bikefile user=bikefile password=bikefile host=localhost'

import psycopg2
from psycopg2.extras import RealDictCursor as _RealDictCursor

def _decode_line(encoded):
    """Decodes a polyline that was encoded using the Google Maps method.

    See http://code.google.com/apis/maps/documentation/polylinealgorithm.html
    
    This is a straightforward Python port of Mark McClure's JavaScript polyline decoder
    (http://facstaff.unca.edu/mcmcclur/GoogleMaps/EncodePolyline/decode.js)
    and Peter Chng's PHP polyline decode
    (http://unitstep.net/blog/2008/08/02/decoding-google-maps-encoded-polylines-using-php/)
    """

    encoded_len = len(encoded)
    index = 0
    array = []
    lat = 0
    lng = 0

    while index < encoded_len:
        b = 0
        shift = 0
        result = 0

        while True:
            b = encoded[index] - 63
            index = index + 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break

        dlat = ~(result >> 1) if result & 1 else result >> 1
        lat += dlat

        shift = 0
        result = 0

        while True:
            b = encoded[index] - 63
            index = index + 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break

        dlng = ~(result >> 1) if result & 1 else result >> 1
        lng += dlng

        array.append((lat * 1e-5, lng * 1e-5))

    return array

def _polyline_to_sql(polyline):
    points = [ 'ST_MakePoint(%f,%f)' % (p[1], p[0]) for p in polyline ]
    return "ST_SetSRID(ST_MakeLine(ARRAY[%s]), 4326)" % (','.join(points),)

def _get_city(path_info):
    for city in CITIES:
        if path_info == '/{0}'.format(city):
            return city

    return None

def application(env, start_response):
    city = _get_city(env['PATH_INFO'])

    if city is None:
        start_response('404 Not Found', [
            ('Content-Type', 'text/plain; charset=UTF-8')
        ])
        return [ b'Path must look like "/montreal"' ]

    query_string = env['wsgi.input'].read()
    qs = cgi.parse_qs(query_string)
    encoded_polyline = qs.get(b'encoded_polyline', [''])[0]

    polyline = _decode_line(encoded_polyline)

    if polyline is None or len(polyline) == 0:
        start_response('404 Not Found', [
            ('Content-Type', 'text/plain; charset=UTF-8')
        ])
        return [ b'You must POST a parameter named "encoded_polyline"' ]

    polyline_as_sql = _polyline_to_sql(polyline)

    # TODO: add bounds WHERE clause, using GiST
    q = '''SELECT
            *,
            (ST_Line_Locate_Point(path.path, ST_ClosestPoint(path.path, "Location"::geometry)) * ST_Length(path.path::geography))::INT AS distance_along_path
        FROM %s
        INNER JOIN (SELECT %s AS path) path ON 1=1
        WHERE ST_DWithin("Location", path.path::geography, 20)
          AND "Time" > '2001-01-01 00:00:00'
        ORDER BY distance_along_path
        ''' % (city, polyline_as_sql)

    db = psycopg2.connect(DSN)
    c = db.cursor(cursor_factory=_RealDictCursor)
    c.execute(q)

    response_data = c.fetchall()

    # datetime is not JSON serializable
    for record in response_data:
        for k, v in record.items():
            if hasattr(v, 'strftime'):
                record[k] = v.strftime('%Y-%m-%d %H:%M:%S')
        record.pop('Location')
        record.pop('path')

    ustring = json.dumps(response_data, ensure_ascii=False, check_circular=False, separators=(',', ':'))
    utf8string = ustring.encode('utf-8')

    start_response('200 OK', [
        ('Content-Type', 'application/json;charset=UTF-8'),
        ('Content-Length', str(len(utf8string))),
        ('Access-Control-Allow-Origin', '*')
        ])
    return [utf8string]
