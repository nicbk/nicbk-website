# Constraints and Behavior: A Checkpoint Every Six Hours

The feature's [constraints-and-behavior.md](../../constraints-and-behavior.md):

- "What a checkpoint holds";
- "The order inside a run";
- "Schedule, retention and alerts", except the drills and the watcher;
- "Where it goes".

## Acceptance criteria

The feature's criteria 1, 2 and 9. Also:

- the deploy unit and the backup unit never run at the same time;
- a plain `docker compose up` starts neither backup service;
- the app container's environment holds no backup credential.
