#!/bin/sh
# Every time we start BikeFile (the server), we need to set up the RAM disk
# This must be run as root

DIR=`dirname $0`
DATA="$DIR/bikefile-data.psql"
RAMDISK="$DIR/ramdb"
DATABASE="bikefile"
DBUSER="bikefile"
DBPASSWORD="bikefile"

# Step 1: wipe the DB, if it exists
su postgres -c 'dropdb bikefile' # if it exists
su postgres -c 'psql --quiet -c "DROP TABLESPACE ramdb;"' # if it exists

# Step 2: create the RAM disk
umount -f "$RAMDISK"
rm -rf "$RAMDISK"
mkdir -p "$RAMDISK"
mount -t ramfs none "$RAMDISK"
chown -R postgres:postgres "$RAMDISK"
chmod -R go-rwx "$RAMDISK"

# Step 3: load the DB
# Add the user if it isn't there already
su postgres -c 'psql --quiet -c "CREATE USER bikefile WITH PASSWORD '\''bikefile'\''"'
su postgres -c 'psql --quiet -c "CREATE TABLESPACE ramdb LOCATION '\'"$RAMDISK"\'';"'
su postgres -c 'psql --quiet -c "CREATE DATABASE '"$DATABASE"' WITH TABLESPACE=ramdb OWNER='"$DBUSER"';"'
su postgres -c 'psql --quiet -d '"$DATABASE"' -f /usr/share/postgresql/9.1/contrib/postgis-1.5/postgis.sql'
# Ignore errors while restoring--it seems to work in spite of them
/usr/share/postgresql-9.1-postgis/utils/new_postgis_restore.pl "$DATA" | su postgres -c 'psql --quiet -d '"$DATABASE"''

# Step 3: Make sure the log directory exists
mkdir -p "$DIR/log"
chmod 777 "$DIR/log"
