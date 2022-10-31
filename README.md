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

## 2. Frontend

It's just a website. Run `coffee -o frontend/web -c frontend/src/app.coffee` to compile `app.js`. Everything else is a flat file.

Run a web server, with its document root set at the `frontend/web` directory.

## 3. Hosting

We host on Amazon Web Services.

1. To upload the latest code: `aws s3 sync frontend/web/ s3://openroad.adamhooper.com/`
2. To reset servers: `cd tf && terraform apply`

# License

Everything in this directory is public-domain, except files that mention otherwise.

Want another license? Ask adam@adamhooper.com and you shall receive.
