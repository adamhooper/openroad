#!/bin/sh

case $reason in
  BOUND|RENEW|REBIND|REBOOT)
    ipaddr=$(ip addr show to 0.0.0.0/0 scope global | awk '/inet / { print $2 }' | cut -d '/' -f 1)
    for ip in $ipaddr ; do
      HOSTNAME=$(host $ipaddr | awk '{ print $5 }' | head -c -2)
      [ -n "$HOSTNAME" ] && { hostname ${HOSTNAME} ; break; }
    done
    ;;
  EXPIRE|FAIL|RELEASE|STOP)
    ;;
esac
