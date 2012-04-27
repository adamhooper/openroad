#!/bin/sh

set -x

# ~/.ec2/env.sh must export:
# * EC2_USER_ID
# * EC2_CERT
# * EC2_PRIVATE_KEY
# * EC2_URL -- e.g., https://ec2.us-east-1.amazonaws.com
# * EC2_KEYPAIR
# * EC2_ACCESS_KEY_ID
# * EC2_SECRET_ACCESS_KEY
. "$HOME/.ec2/env.sh"

DIR=$(readlink -f `dirname $0`)
IMAGE_FILENAME="precise-server-cloudimg-amd64.img"
BUNDLE_DIR=/tmp
ARCH=x86_64
BUCKET=bikefile-images
IMAGE_METADATA_URL="http://uec-images.ubuntu.com/query/precise/server/released.current.txt"
KERNEL_METADATA_REGEX="instance-store.amd64.us-east-1.*paravirtual"

ec2-bundle-image \
  --image "$DIR"/"$IMAGE_FILENAME" \
  --cert $EC2_CERT \
  --privatekey $EC2_PRIVATE_KEY \
  --user $EC2_USER_ID \
  --arch $ARCH

ec2-upload-bundle \
  --bucket "$BUCKET" \
  --manifest "$BUNDLE_DIR"/"$IMAGE_FILENAME".manifest.xml \
  --access-key "$EC2_ACCESS_KEY_ID" \
  --secret-key "$EC2_SECRET_ACCESS_KEY"

KERNEL=$(wget -qO- $IMAGE_METADATA_URL | egrep "$KERNEL_METADATA_REGEX" | cut -f9)

ec2-register "$BUCKET"/"$IMAGE_FILENAME".manifest.xml \
  --kernel "$KERNEL"
