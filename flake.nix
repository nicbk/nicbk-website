{
  # NixOS integration for the production host — consumed as a pinned flake
  # input by the host's separate system flake
  # (research/devops-deployment/hosting-and-infrastructure.md). Scope is
  # deliberately narrow: enable Docker and wire the pull-based deploy
  # timer; the stack itself lives entirely in docker-compose.yml.
  description = "nicbk-website: Docker + pull-based deploy timer NixOS module";

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
          };

          config = lib.mkIf cfg.enable {
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
          };
        };
    };
}
