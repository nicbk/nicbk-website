# Constraints and Behavior: A Restore That Relaunches

The feature's [constraints-and-behavior.md](../../constraints-and-behavior.md),
"Restore".

## Acceptance criteria

The feature's criteria 3, 4, 5 and 6. Also:

- `restore.sh` without `--replace` refuses a project that has data;
- restoring beside production (`--project`) touches nothing of production's.
