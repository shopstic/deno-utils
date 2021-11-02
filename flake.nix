{
  description = "Deno Utils";

  nixConfig.substituters = [
    "s3://nix/?profile=nix-cache&scheme=https&endpoint=nyc3.digitaloceanspaces.com"
    "https://cache.nixos.org/"
  ];

  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachSystem [ "x86_64-linux" "x86_64-darwin" "aarch64-darwin" ] (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      rec {
        devShell = import ./nix/shell.nix { inherit pkgs; };
        packages = {
          devEnv = devShell.inputDerivation;
        };
        defaultPackage = pkgs.stdenv.mkDerivation {
          name = "deno-utils";
          src = ./.;
          buildInputs = devShell.buildInputs;
          installPhase = ''
            export DENO_DIR="$TMPDIR/.deno"
            bash ./ci.sh
            mkdir -p $out
          '';
        };
      }
    );
}
