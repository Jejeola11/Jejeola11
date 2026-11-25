#!/usr/bin/env bash
set -euo pipefail
node --test tests/credit-policy.test.cjs && cd atelier-v2/media/academy && f=course-intro-upload-1763.mp4 && cat course-upload-part[0-9][0-9] > $f && echo "e2c9f9a9d1ef3c50569319719ce3ea2937fba18f1348347502c6e315c33caa56  $f" | sha256sum -c - && rm course-upload-part* course-original.part*
