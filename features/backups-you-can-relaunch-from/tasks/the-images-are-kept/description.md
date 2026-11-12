# Task: The Images Are Kept

Task 5 of 5 of [#32](../../description.md). Sub-issue
[#272](https://github.com/nicbk/nicbk-website/issues/272).

A relaunch does not depend on Docker Hub (BK11).

## Changes

- **`deploy/images.sh save`**, run at the end of a backup at most once a day:
  - list the digests of every image the stack runs, the built app image
    included;
  - if they differ from the newest `images` snapshot's list, `docker save` them
    (uncompressed, since restic compresses) into a separate staging directory,
    and make an `images` snapshot with the digest list;
  - otherwise do nothing.
- **`restore.sh --load-images`** `docker load`s the images from the snapshot
  matching the checkpoint's manifest digests, or the newest one. Then
  `compose up` runs without pulling or building.
- **Retention:** `--tag images --keep-last 4`, already in `prune.sh`.
- **The runbook:** when to use `--load-images`.
