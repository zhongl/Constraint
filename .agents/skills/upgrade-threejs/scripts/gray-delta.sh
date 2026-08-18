#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: gray-delta.sh <current.png> <reference.png>" >&2
  exit 2
fi

command -v magick >/dev/null || { echo 'magick is required' >&2; exit 1; }

current=$(magick "$1" -colorspace gray -format '%[fx:mean]' info:)
reference=$(magick "$2" -colorspace gray -format '%[fx:mean]' info:)

awk -v current="$current" -v reference="$reference" '
BEGIN {
  delta = current - reference;
  relative = delta / reference * 100;
  printf "current=%s\nreference=%s\nabsolute_delta=%.6f\nrelative_delta=%.2f%%\n", current, reference, delta, relative;
  if (relative < -3 || relative > 3) exit 1;
}'
