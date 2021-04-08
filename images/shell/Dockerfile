FROM shopstic/bin-deno:1.8.3 as bin-deno

FROM ubuntu:20.04

ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
ENV TERM=xterm-256color

COPY --from=bin-deno /usr/bin/deno /usr/bin/deno