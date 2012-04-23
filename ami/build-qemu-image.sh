#!/bin/sh

# Create a qemu machine image, for testing before uploading to Amazon

DIRNAME=`dirname $0`
FIRSTBOOT=`readlink -f "$DIRNAME/firstboot.sh"`

pg_dump -Fc -O -f "$DIRNAME/bikefile-data.psql" bikefile

sudo vmbuilder qemu ubuntu \
  --arch=amd64 \
  --mem=1024 \
  --user=bikefile \
  --pass=bikefile \
  --suite=oneiric \
  --flavour=virtual \
  --rootsize=1024 \
  --optsize=1024 \
  --copy="$DIRNAME/files/FILES" \
  --firstboot="$FIRSTBOOT" \
  --install-mirror=http://127.0.0.1:3142/ubuntu \
  --addpkg=postgresql-9.1-postgis \
  --addpkg=python-psycopg2 \
  --addpkg=uwsgi-plugin-python \
  --addpkg=nginx-full \
  --addpkg=acpid \
  --addpkg=bind9-host \
  --addpkg=openssh-server \
  --tmpfs=- \
  -v
