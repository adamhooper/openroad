#!/usr/bin/env python3

class DbSchemaRow:
    def __init__(self, name, sqlType, sqlExtra=""):
        self.name = name
        self.sqlType = sqlType
        self.sqlExtra = sqlExtra

class DbSchemaTable:
    def __init__(self, name, rows):
        self.name = name
        self.rows = rows

class DbTable:
    def __init__(self, db, schema, logger=None):
        self.db = db
        self.schema = schema
        self.logger = logger

        self.schemaRows = {}
        for row in self.schema.rows:
            self.schemaRows[row.name] = row

    def createIfNotExists(self):
        cursor = self.db.cursor()

        sql = 'CREATE TABLE IF NOT EXISTS "%s" (id SERIAL PRIMARY KEY, %s)' % (
            self.schema.name,
            ', '.join([ '"%s" %s %s' % (sr.name, sr.sqlType, sr.sqlExtra) for sr in self.schema.rows ])
        )
        self.logger.info('Execute: %s' % (sql,))
        cursor.execute(sql)
        self.db.commit()

    def createSpatialIndex(self):
        cursor = self.db.cursor()

        sql = 'ALTER TABLE "%s" ADD COLUMN "Location" GEOGRAPHY' % (self.schema.name,)
        self.logger.info('EXECUTE: %s' % (sql,))
        cursor.execute(sql)
        self.db.commit()

        sql = 'UPDATE "%s" SET "Location" = ST_SetSRID(ST_MakePoint("Longitude", "Latitude"), 4326)' % (self.schema.name,)
        self.logger.info('EXECUTE: %s' % (sql,))
        cursor.execute(sql)
        self.db.commit()

        sql = 'CREATE INDEX "%s_spatial" ON %s USING GIST ("Location")' % (self.schema.name, self.schema.name)
        self.logger.info('Execute: %s' % (sql,))
        cursor.execute(sql)
        self.db.commit()

        self.db.vacuum(self.schema.name)

    def insertRow(self, row):
        sql = 'INSERT INTO "%s" (%s) VALUES (%s)' % (
            self.schema.name,
            ', '.join([ '"%s"' % (sr.name) for sr in self.schema.rows ]),
            ', '.join([ '%s' ] * len(self.schema.rows))
        )
        values = [ self._castValue(sr.name, row[sr.name]) for sr in self.schema.rows ]

        self.logger.info('Execute: %s -- with %r' % (sql, values))

        cursor = self.db.cursor()
        cursor.execute(sql, values)
        self.db.commit()

    def fetchExistingRowWithData(self, row):
        rowAsList = [ (name, value) for name, value in row.items() if name in self.schemaRows ]

        sql = 'SELECT * FROM "%s" WHERE (%s)' % (
            self.schema.name,
            ' AND '.join([ self._equalsExpression(name, value) for name, value in rowAsList ])
        )
        values = [ self._equalsValue(name, value) for name, value in rowAsList ]
        values = [ x for x in values if x is not None ]

        self.logger.info('Execute: %s -- with %r' % (sql, values))

        cursor = self.db.cursor()
        cursor.execute(sql, values)
        return cursor.fetchone()

    def _equalsExpression(self, column, value):
        sqlType = self.schemaRows[column].sqlType

        if len(value) == 0 and sqlType == 'INT':
            return '"%s" IS NULL' % (column,)
        else:
            return '"%s" = %s::%s' % (column, '%s', sqlType)

    def _equalsValue(self, column, value):
        sqlType = self.schemaRows[column].sqlType

        if len(value) == 0 and sqlType == 'INT':
            return None
        else:
            return value

    def _castValue(self, column, value):
        sqlType = self.schemaRows[column].sqlType

        if isinstance(value, str) and len(value) == 0 and sqlType == 'INT':
            return None
        else:
            return value
