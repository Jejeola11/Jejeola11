#!/usr/bin/env bash
set -euo pipefail
if ! curl -fsSI --max-time 15 'https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/home/monetize-cutout-1e1a7886818e.png' >/dev/null; then
  printf 'user = "%s:%s"\n' "$R2_ACCESS_KEY_ID" "$R2_SECRET_ACCESS_KEY" | curl --config - --fail --silent --show-error --max-time 45 --aws-sigv4 'aws:amz:auto:s3' --header 'Content-Type: image/png' --upload-file 'scripts/home-r2/monetize.png' 'https://c63decad40891f44d095f71a8f6b489c.r2.cloudflarestorage.com/fuse-public-media/home/monetize-cutout-1e1a7886818e.png'
fi
if ! curl -fsSI --max-time 15 'https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/home/learn-cutout-05015640d3fc.png' >/dev/null; then
  printf 'user = "%s:%s"\n' "$R2_ACCESS_KEY_ID" "$R2_SECRET_ACCESS_KEY" | curl --config - --fail --silent --show-error --max-time 45 --aws-sigv4 'aws:amz:auto:s3' --header 'Content-Type: image/png' --upload-file 'scripts/home-r2/learn.png' 'https://c63decad40891f44d095f71a8f6b489c.r2.cloudflarestorage.com/fuse-public-media/home/learn-cutout-05015640d3fc.png'
fi
if ! curl -fsSI --max-time 15 'https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/home/create-cutout-b3c858f9ecf5.png' >/dev/null; then
  printf 'user = "%s:%s"\n' "$R2_ACCESS_KEY_ID" "$R2_SECRET_ACCESS_KEY" | curl --config - --fail --silent --show-error --max-time 45 --aws-sigv4 'aws:amz:auto:s3' --header 'Content-Type: image/png' --upload-file 'scripts/home-r2/create.png' 'https://c63decad40891f44d095f71a8f6b489c.r2.cloudflarestorage.com/fuse-public-media/home/create-cutout-b3c858f9ecf5.png'
fi
rm -rf scripts/home-r2
node --test tests/credit-policy.test.cjs && cd atelier-v2/media/academy && f=course-intro-upload-1763.mp4 && cat course-upload-part[0-9][0-9] > $f && echo "e2c9f9a9d1ef3c50569319719ce3ea2937fba18f1348347502c6e315c33caa56  $f" | sha256sum -c - && rm course-upload-part* course-original.part*
