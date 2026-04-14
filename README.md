# jobscanner

jobscanner is a command line utility to automatically scan job boards to surface the best matches for you.

> [!IMPORTANT]
> This project uses bun instead of node, to use this project you'll first have to install from [bun.sh](https://bun.sh/)

## Setup

To setup the project use:

```bash
bun install
```

## Usage

``` bash
./jobscanner <command> [options]
```

**Commands:**
- `scan` - runs a job scan against the sources defined in the config file
  - options:
  - `--config <config-file-path>` - specify the path to the config file (default: config.yaml)
- `validate` - checks the config file for correctness
  - options:
  - `--config <config-file-path>` - specify the path to the config file (default: config.yaml)

## Testing

```bash
bun test
```

Tests are stored in the top-level `tests/` folder.
