{
  description = "Deno Utils";

  inputs = {
    hotPot.url = "github:shopstic/nix-hot-pot";
    flakeUtils.follows = "hotPot/flakeUtils";
    nixpkgs.follows = "hotPot/nixpkgs";
  };

  outputs = { self, nixpkgs, flakeUtils, hotPot }:
    flakeUtils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ] (system:
      let
        pkgs = import nixpkgs { inherit system; };
        hotPotPkgs = hotPot.packages.${system};
      in
      rec {
        devShell = pkgs.mkShellNoCC {
          buildInputs = [
            hotPotPkgs.deno
          ];
        };
        defaultPackage = devShell.inputDerivation;
      }
    );
}
