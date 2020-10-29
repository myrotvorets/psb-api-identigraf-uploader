#!/bin/sh

/usr/bin/wget -q http://127.0.0.1:${PORT:-80}/monitoring/health -O /dev/null 2> /dev/null || exit 1
