# For non-techies

This tool is meant for everybody to use it. However, you're looking at the source code now! This page is for geeks.

See it in action at (from west to east):

* http://vancouver.openfile.ca/openroad
* http://calgary.openfile.ca/openroad
* http://toronto.openfile.ca/openroad
* http://ottawa.openfile.ca/openroad
* http://montreal.openfile.ca/openroad
* http://halifax.openfile.ca/openroad

Here's how it works: users select a path, and we show the accidents that occurred along that path.

# For geeks

Want to run your own? You'll need a few things. UNIX is assumed in these instructions, though you can probably manage all this on Windows.

## 1. Data

The hardest part is acquiring data. In most of our cities, we filed access to information requests, then yada yada yada, and now we have .csv files. The `README` file in the `data` directory explains what's in the CSV files.

## 2. Backend

The website has two parts: the "frontend", which looks like a normal website, and the "backend", which finds accidents. The backend receives a `POST` request with an `encoded_polyline` parameter, and it returns a JSON responce.

To set up your own, you'll first need to install a PostgreSQL database, with PostGIS. Then run the scripts in the `importer` directory (described in `data/README`) to populate it. Most of our datasets don't come geocoded, so our import scripts take care of that. We used Google's geocoder; the terms of service forbid us from sharing the resulting latitudes and longitudes except when they're shown on a Google map.

Next install uwsgi (on Python 2.7) and psycopg2. Then you can run (on Debian): `uwsgi_python27 --http :8000 ./backend/wsgi_server.py`, for instance, to run the backend server on the command-line.

## 3. Frontend

It's just a website. Run `coffee -o frontend/web -c frontend/src/app.coffee` to compile `app.js`. Everything else is a flat file.

Run a web server, with its document root set at the `frontend/web` directory. To get it to point to your back-end, you can fiddle with the URL in `app.coffee` or fiddle with a reverse-proxy on your web server. Look at `ami/files/nginx-virtual.conf` for an example.

## 4. Hosting

It would be easy to replace WSGI with PHP, but few hosting providers have fast, reliable PostGIS servers. There's a modest CPU requirement, too, which grows according to the size of the dataset and length of the path.

We use Amazon Web Services. Create an account, an X.509 certificate ... the works. Then run `ami/build-ami.sh` and then `ami-upload-ami.sh` to upload an Amazon Machine Image to S3. You can launch it from the AWS website. To upload front-end modifications, copy the files in `frontend/web/` to `ubuntu@machine:/opt/bikefile/frontend`. To upload back-end modifications, copy a PostgreSQL dump to `machine:/opt/bikefile/bikefile-data.psql` and the WSGI server to `machine:/opt/bikefile/backend/`, then run `sudo /etc/init.d/bikefile_uwsgi stop; sudo /etc/init.d/bikefile_uwsgi start`.

The hosted solution loads the entire database from the dump file into a ramdisk on start. That might not be an improvement over PostgreSQL's caching mechanisms (I haven't tested), but it's the closest we could get to the "really, we just have one data file" mentality.

# License

Everything in this directory is public-domain, except for the `.js` and `.css` files in `frontend/web/` which have license information in their headers. (The `.js` and `.css` files which don't are public domain.)

Want another license? Ask adam@adamhooper.com and you shall receive.
