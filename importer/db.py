#!/usr/bin/env python

import psycopg2 as _psycopg2
from psycopg2.extras import RealDictCursor as _Cursor

class Db:
    def __init__(self, dsn, logger=None):
        self.db = _psycopg2.connect(dsn)
        self.logger = logger

        if self.logger: self.logger.info('Connected to database')

    def cursor(self):
        return self.db.cursor(cursor_factory=_Cursor)

    def commit(self):
        self.db.commit()

    def vacuum(self, tableName):
        sql = 'VACUUM ANALYZE "%s"' % (tableName,)
        if self.logger: self.logger.info(sql)

        isolation_level = self.db.isolation_level
        self.db.set_isolation_level(0)
        cursor = self.cursor()
        cursor.execute(sql)
        self.db.set_isolation_level(isolation_level)
