{
  # NixOS integration for the production host — consumed as a pinned flake
  # input by the host's separate system flake
  # (research/devops-deployment/hosting-and-infrastructure.md). Scope is
  # deliberately narrow: enable Docker and wire the pull-based deploy
  # timer and the backup timers; the stack itself lives entirely in
  # docker-compose.yml, and the jobs' logic in deploy/.
  description = "nicbk-website: Docker, the pull-based deploy timer and the backup jobs, as a NixOS module";

  outputs =
    { self }:
    {
      nixosModules.default =
        {
          config,
          lib,
          pkgs,
          ...
        }:
        let
          cfg = config.services.nicbk-website;
        in
        {
          options.services.nicbk-website = {
            enable = lib.mkEnableOption "the nicbk-website compose stack with pull-based continuous deployment";

            repoPath = lib.mkOption {
              type = lib.types.str;
              example = "/var/lib/nicbk-website";
              description = ''
                Absolute path to an existing clone of the nicbk-website
                repository on the host, with `origin` pointing at GitHub.
                The initial clone and the git-ignored `.env` next to
                docker-compose.yml are provisioned manually, like all
                host-side secrets (see
                research/devops-deployment/secrets-and-environment-config.md).
              '';
            };

            pollInterval = lib.mkOption {
              type = lib.types.str;
              default = "2min";
              description = ''
                How often the deploy timer polls origin/main (systemd
                calendar/interval syntax). Every merge to main deploys
                within one interval — see
                research/devops-deployment/deployment-strategy.md.
              '';
            };

            # Backups you can relaunch from (features/backups-you-can-relaunch-from).
            # The logic lives in deploy/ in the checkout, like the deploy
            # script, so it updates with every merge; these options only
            # schedule it and say where its state and credentials are.
            backup = {
              enable = lib.mkEnableOption "six-hourly backup checkpoints of the stack to an off-site restic repository";

              stateDir = lib.mkOption {
                type = lib.types.str;
                default = "/var/lib/nicbk-website-backup";
                description = ''
                  Where the checkpoint is assembled before it is sent off the
                  node: a Postgres dump, a mirror of every stored PDF, and a
                  copy of the .env. Needs room for a second copy of the
                  bucket. Readable by root only.
                '';
              };

              environmentFile = lib.mkOption {
                type = lib.types.str;
                example = "/var/lib/nicbk-website-backup/backup.env";
                description = ''
                  A root-only file of the backup's credentials, in the shape of
                  deploy/backup.env.example: the restic repository and
                  password, the node's B2 key, and the ntfy topic for alerts.
                  Provisioned by hand (deploy/README-backups.md), never in git
                  or the Nix store.
                '';
              };

              schedule = lib.mkOption {
                type = lib.types.str;
                default = "00/6:00";
                description = ''
                  When a checkpoint is taken (systemd OnCalendar syntax). Six
                  hours bounds what a relaunch can lose (BK1).
                '';
              };

              pruneSchedule = lib.mkOption {
                type = lib.types.str;
                default = "Sun 03:30";
                description = ''
                  When old checkpoints are pruned and the size ceiling applied
                  (systemd OnCalendar syntax), then the repository checked.
                '';
              };
            };
          };

          config = lib.mkIf cfg.enable (
            lib.mkMerge [
              {
                virtualisation.docker.enable = true;

                systemd.services.nicbk-website-deploy = {
                  description = "nicbk-website pull-based deploy (git pull + docker compose build/up)";
                  after = [
                    "network-online.target"
                    "docker.service"
                  ];
                  wants = [ "network-online.target" ];
                  requires = [ "docker.service" ];
                  # The deploy script lives in the checkout itself, so deploy
                  # logic updates ride along with normal merges to main.
                  path = [
                    pkgs.bash
                    pkgs.git
                    pkgs.openssh
                    # flock: deploy.sh takes the lock the backup jobs take too.
                    pkgs.util-linux
                    config.virtualisation.docker.package
                  ];
                  serviceConfig = {
                    Type = "oneshot";
                    ExecStart = "${pkgs.bash}/bin/bash ${cfg.repoPath}/deploy/deploy.sh ${cfg.repoPath}";
                  };
                };

                systemd.timers.nicbk-website-deploy = {
                  description = "Poll origin/main and redeploy nicbk-website on new commits";
                  wantedBy = [ "timers.target" ];
                  timerConfig = {
                    OnBootSec = "2min";
                    OnUnitActiveSec = cfg.pollInterval;
                  };
                };
              }

              (lib.mkIf cfg.backup.enable (
                let
                  # What the scripts in deploy/ call. restic and rclone are not
                  # here: they run as the pinned images of the Compose `backup`
                  # profile, so their versions are reviewed in the repository.
                  scriptPath = [
                    pkgs.bash
                    pkgs.coreutils
                    pkgs.findutils
                    pkgs.gawk
                    pkgs.gnugrep
                    pkgs.gnused
                    pkgs.git
                    pkgs.jq
                    pkgs.curl
                    pkgs.util-linux
                    config.virtualisation.docker.package
                  ];

                  # A oneshot job running one script from the checkout, with the
                  # backup credentials, alerting when it fails.
                  backupJob = description: script: {
                    inherit description;
                    after = [
                      "network-online.target"
                      "docker.service"
                    ];
                    wants = [ "network-online.target" ];
                    requires = [ "docker.service" ];
                    path = scriptPath;
                    environment.NICBK_BACKUP_DIR = cfg.backup.stateDir;
                    onFailure = [ "nicbk-website-alert@%n.service" ];
                    serviceConfig = {
                      Type = "oneshot";
                      EnvironmentFile = cfg.backup.environmentFile;
                      ExecStart = "${pkgs.bash}/bin/bash ${cfg.repoPath}/deploy/${script} ${cfg.repoPath}";
                      UMask = "0077";
                    };
                  };

                  backupTimer = description: onCalendar: {
                    inherit description;
                    wantedBy = [ "timers.target" ];
                    timerConfig = {
                      OnCalendar = onCalendar;
                      # A run missed while the node was off happens at the next
                      # boot, rather than waiting for the next slot.
                      Persistent = true;
                      RandomizedDelaySec = "5min";
                    };
                  };
                in
                {
                  systemd.tmpfiles.rules = [ "d ${cfg.backup.stateDir} 0700 root root -" ];

                  systemd.services.nicbk-website-backup = backupJob "nicbk-website backup checkpoint (dump, bucket mirror, check, restic snapshot)" "backup.sh";
                  systemd.timers.nicbk-website-backup = backupTimer "Take a nicbk-website backup checkpoint" cfg.backup.schedule;

                  systemd.services.nicbk-website-prune = backupJob "nicbk-website backup prune (retention, size ceiling, check)" "prune.sh";
                  systemd.timers.nicbk-website-prune = backupTimer "Prune nicbk-website backup checkpoints" cfg.backup.pruneSchedule;

                  # One failure alert for every job above and the deploy: the
                  # failed unit's name arrives as the instance (%i).
                  systemd.services."nicbk-website-alert@" = {
                    description = "Alert the operator that %i failed";
                    path = [
                      pkgs.bash
                      pkgs.curl
                      pkgs.systemd
                    ];
                    serviceConfig = {
                      Type = "oneshot";
                      EnvironmentFile = cfg.backup.environmentFile;
                      ExecStart = "${pkgs.bash}/bin/bash ${cfg.repoPath}/deploy/alert.sh %i";
                    };
                  };

                  systemd.services.nicbk-website-deploy.onFailure = [ "nicbk-website-alert@%n.service" ];
                }
              ))
            ]
          );
        };
    };
}
