#!/bin/bash

# Regenerate the ssh host key
rm -f /etc/ssh/ssh_host_*_key*

ssh-keygen -f /etc/ssh/ssh_host_rsa_key -t rsa -N '' | logger -s -t "ec2"
ssh-keygen -f /etc/ssh/ssh_host_dsa_key -t dsa -N '' | logger -s -t "ec2"

# This allows user to get host keys securely through console log
echo "-----BEGIN SSH HOST KEY FINGERPRINTS-----" | logger -s -t "ec2"
ssh-keygen -l -f /etc/ssh/ssh_host_rsa_key.pub | logger -s -t "ec2"
ssh-keygen -l -f /etc/ssh/ssh_host_dsa_key.pub | logger -s -t "ec2"
echo "-----END SSH HOST KEY FINGERPRINTS-----" | logger -s -t "ec2"

depmod -a

echo 'PasswordAuthentication no' >> /etc/ssh/sshd_config

# Set up login
chown bikefile:bikefile /home/bikefile -R
chmod -R 700 /home/bikefile/.ssh

# Install BikeFile
DIR=/opt/bikefile
INIT_NAME="bikefile_uwsgi"

mkdir -p "$DIR/log"
chmod 755 "$DIR/log"
chown -R bikefile:bikefile "$DIR"

su postgres -c 'psql --quiet -c "CREATE USER bikefile WITH PASSWORD '\''bikefile'\''"'

update-rc.d "$INIT_NAME" defaults 80 80
$INIT_NAME start

rm /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/bikefile /etc/nginx/sites-enabled/bikefile
/etc/init.d/nginx reload

exit 0
