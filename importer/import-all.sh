#!/bin/sh

DIR=`dirname $0`

for city in vancouver calgary toronto ottawa montreal halifax; do
  $DIR/importer.py $DIR/../data/$city.csv
done
