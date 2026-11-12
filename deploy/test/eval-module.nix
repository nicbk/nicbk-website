# Evaluates this repository's NixOS module (flake.nix) inside a minimal NixOS
# system, and returns what the backup feature generated, so CI can check the
# module without a NixOS host (deploy/test/eval-module.sh). A module that fails
# to evaluate would otherwise first fail on the node, at its next rebuild.
#
# nixpkgs is a stable release branch: the module must work on what the host
# runs, and a moving unstable channel would turn CI red for reasons no PR here
# caused. Fetched as the channel's own tarball from channels.nixos.org, the
# release NixOS hosts track, rather than through GitHub's API and its limits.
{ repo, backup }:
let
  nixpkgs = builtins.fetchTarball "https://channels.nixos.org/nixos-26.05/nixexprs.tar.xz";
  flake = builtins.getFlake (toString repo);
  system = import "${nixpkgs}/nixos/lib/eval-config.nix" {
    system = "x86_64-linux";
    modules = [
      flake.nixosModules.default
      {
        # The least a NixOS system needs to evaluate.
        boot.loader.grub.enable = false;
        fileSystems."/" = {
          device = "/dev/null";
          fsType = "ext4";
        };
        system.stateVersion = "26.05";
        services.nicbk-website = {
          enable = true;
          repoPath = "/var/lib/nicbk-website";
          backup = {
            enable = backup;
            environmentFile = "/var/lib/nicbk-website-backup/backup.env";
          };
        };
      }
    ];
  };
  services = system.config.systemd.services;
  timers = system.config.systemd.timers;
  unit =
    name:
    if services ? ${name} then
      {
        exec = services.${name}.serviceConfig.ExecStart;
        onFailure = services.${name}.onFailure or [ ];
        environmentFile = services.${name}.serviceConfig.EnvironmentFile or null;
      }
    else
      null;
in
{
  deploy = unit "nicbk-website-deploy";
  backup = unit "nicbk-website-backup";
  prune = unit "nicbk-website-prune";
  alert = unit "nicbk-website-alert@";
  backupTimer = timers.nicbk-website-backup.timerConfig or null;
  pruneTimer = timers.nicbk-website-prune.timerConfig or null;
  # Forces every unit to evaluate, as a rebuild would.
  unitCount = builtins.length (builtins.attrNames system.config.systemd.units);
}
