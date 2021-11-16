{
  description = "Deno Utils";

  inputs.flakeUtils.url = "github:numtide/flake-utils";
  inputs.nixHotPot.url = "github:shopstic/nix-hot-pot";

  outputs = { self, nixpkgs, flakeUtils, nixHotPot }:
    flakeUtils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ] (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        hotPot = nixHotPot.packages.${system};
      in
      rec {
        devShell = pkgs.mkShellNoCC {
          buildInputs = [
            hotPot.deno
          ];
        };
        defaultPackage = devShell.inputDerivation;
      }
    );
}
