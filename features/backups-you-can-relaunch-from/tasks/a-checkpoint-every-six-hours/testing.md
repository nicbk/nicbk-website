# Testing: A Checkpoint Every Six Hours

The feature's [testing.md](../../testing.md):

- **Static checks:** all of them.
- **The round trip:** steps 1–4.
- **Measure and record** in this task's status:
  - whether `rclone sync --checksum` works against Garage;
  - the scratch-restore check's time on the seeded data;
  - that nothing in the live database's `zero*` schemas changed during a run.
