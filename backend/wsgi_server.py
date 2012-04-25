#!/usr/bin/env python2.7

CITIES = [ 'montreal', 'toronto', 'calgary', 'vancouver', 'ottawa', 'halifax' ]
DSN = 'dbname=bikefile user=bikefile password=bikefile host=localhost'

RANGE_IN_M = 30
ERROR_IN_M = 25
MAX_DISTANCE_IN_M = 8000
DEFAULT_MIN_DATE = '2007-01-01'
DEFAULT_MAX_DATE = '2011-01-01'

import cgi
import json
import re

import psycopg2
from psycopg2.extras import RealDictCursor as _RealDictCursor

M_PER_DEGREE = 110574.27 # very rough

error_in_degrees2 = (ERROR_IN_M / M_PER_DEGREE)**2

def distance_squared_from_segment_to_point(segment, point):
    p1, p2 = segment
    p = point

    vx = p1[0] - p[0]
    vy = p1[1] - p[1]

    if p1 == p2:
        return vx*vx + vy*vy

    ux = p2[0] - p1[0]
    uy = p2[1] - p1[1]
    length2 = ux*ux + uy*uy

    det = (-vx*ux) + (-vy*uy)

    if (det < 0 or det > length2):
        # We're outside the line segment
        ux = p2[0] - p[0]
        uy = p2[1] - p[1]
        return min(vx*vx+vy*vy, ux*ux+uy*uy)

    det = ux*vy - uy*vx
    return det*det / length2

def douglas_peucker_step(points, distance_squared):
    segment = ( points[0], points[-1] )
    max_i = 0
    max_d = 0

    for i in xrange(1, len(points) - 1):
        p = points[i]
        d = distance_squared_from_segment_to_point(segment, p)
        if d > max_d:
            max_i = i
            max_d = d
    
    if max_d >= distance_squared:
        return douglas_peucker_step(points[:max_i], distance_squared) + douglas_peucker_step(points[max_i:], distance_squared)
    else:
        return segment

def simplify_line(points):
    v1 = len(points)
    ret = douglas_peucker_step(points, error_in_degrees2)
    v2 = len(ret)
    print("Before: %d; after: %d; error: %f" % (v1, v2, error_in_degrees2))
    return ret

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
            b = ord(encoded[index]) - 63
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
            b = ord(encoded[index]) - 63
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

DATE_REGEX = re.compile(r'(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})')
def format_datetime_string(s, default, time):
    m = DATE_REGEX.match(s)
    if m:
        return '%s-%s-%s %s' % (m.year, m.month, m.day, time)
    else:
        return '%s %s' % (default, time)

def application(env, start_response):
    city = _get_city(env['PATH_INFO'])

    if env['PATH_INFO'] == '/status':
        start_response('200 OK', [
            ('Content-Type', 'text/plain; charset=UTF-8')
        ])
        return [ b'OK' ]

    if city is None:
        start_response('404 Not Found', [
            ('Content-Type', 'text/plain; charset=UTF-8')
        ])
        return [ b'Path must look like "/montreal"' ]

    query_string = env['wsgi.input'].read()
    qs = cgi.parse_qs(query_string)
    encoded_polyline = qs.get(b'encoded_polyline', [''])[0]
    min_datetime = format_datetime_string(qs.get(b'min_date', [''])[0], DEFAULT_MIN_DATE, '00:00:00')
    max_datetime = format_datetime_string(qs.get(b'max_date', [''])[0], DEFAULT_MAX_DATE, '23:59:59')

    polyline = _decode_line(encoded_polyline)

    if polyline is None or len(polyline) < 2:
        start_response('404 Not Found', [
            ('Content-Type', 'text/plain; charset=UTF-8')
        ])
        return [ b'You must POST a parameter named "encoded_polyline"' ]

    polyline = simplify_line(polyline)

    polyline_as_sql = _polyline_to_sql(polyline)

    # Yes, we use string interpolation. But it's all safe.
    q = '''SELECT
            city.*,
            (ST_Line_Locate_Point(path.path, ST_ClosestPoint(path.path, "Location"::geometry)) * ST_Length(path.path::geography))::INT AS distance_along_path
        FROM %s city
        INNER JOIN (
            SELECT CASE WHEN ST_Length(%s::geography) > %d::float
                 THEN ST_Line_Substring(%s, 0.0, %d::float / ST_Length(%s::geography))
                 ELSE %s
            END AS path
            ) path ON 1=1
        WHERE ST_DWithin("Location", path.path::geography, %d)
          AND "Time" >= '%s'
          AND "Time" <= '%s'
        ORDER BY distance_along_path
        ''' % (city,
               polyline_as_sql, MAX_DISTANCE_IN_M, polyline_as_sql, MAX_DISTANCE_IN_M, polyline_as_sql, polyline_as_sql,
               RANGE_IN_M,
               min_datetime, max_datetime)

    print(q)

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

    ustring = json.dumps(response_data, ensure_ascii=False, check_circular=False, separators=(',', ':'))
    utf8string = ustring.encode('utf-8')

    start_response('200 OK', [
        ('Content-Type', 'application/json;charset=UTF-8'),
        ('Content-Length', str(len(utf8string))),
        ('Access-Control-Allow-Origin', '*')
        ])
    return [utf8string]
