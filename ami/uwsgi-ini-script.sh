#!/bin/bash
#
# Start/Stop UWSGI instance
#
### BEGIN INIT INFO
# Provides: bikefile_uwsgi
# Required-Start: nginx
# Required-Stop: nginx
# Default-Start:  2 3 4 5
# Default-Stop: 0 1 6
# Short-Description: start and stop UWSGI instance
# Description: Listen and respond to Web requests for Python WSGI server
### END INIT INFO

RETVAL=0
DIR="/opt/bikefile/backend"
UWSGI=uwsgi_python27
USER=ubuntu
PIDFILE=$(cat $DIR/uwsgi.ini | grep pidfile | cut -d '=' -f 2)

start() {
  /opt/bikefile/init.sh
  su $USER -c "$UWSGI -c $DIR/uwsgi.ini"
  RETVAL=$?
}

stop() {
  kill -INT `cat $PIDFILE`
  RETVAL=$?
}

restart() {
  kill -TERM `cat $PIDFILE`
  RETVAL=$?
} 

case "$1" in
start)
  start
  ;;
stop)
  stop
  ;;
restart)
  restart
  ;;
*)
  echo $"Usage: $0 {start|stop|restart}"
  RETVAL=2
esac

exit $RETVAL

