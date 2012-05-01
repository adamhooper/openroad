#!/bin/sh

DIR=`dirname $0`

for city in vancouver calgary toronto ottawa montreal halifax; do
  $DIR/exporter.py $DIR/$city.fusion-tables-data.csv
done
