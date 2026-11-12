# Testing: The Images Are Kept

- **CI:**
  - save twice and assert one `images` snapshot;
  - record the repository growth of a forced second save;
  - restore with `--load-images` after `docker image rm` of every stack image,
    with pulls blocked (`--pull never`).
- **On the node:** the first save, and its size in the status.
