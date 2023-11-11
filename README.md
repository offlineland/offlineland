## Dev setup:
- Run a webserver that serves this folder (eg., `python -m http.server`)
- The game needs to run in a "Safe origin", make sure that either:
    - your devserver does https (Caddy!),
    - you use `127.0.0.1` or `localhost`,
    - or you configure your browser to assume your dev host is a safe origin.
- `bun install` for type inference
- Type checking works on my machine:TM: (VSCode), but if it doesn't for you you can use `bun run tsc`
