{ pkgs ? import <nixpkgs> { } }:
with pkgs;
let
  denoBin = callPackage ./deno-bin.nix { };
in
mkShell {
  buildInputs = [
    denoBin
  ];
}
