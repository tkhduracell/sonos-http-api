# Docker Documentation and CI Improvements

## Overview
Added comprehensive Docker usage documentation to the README and improved the CI workflow for building and publishing container images.

## Changes

### Docker Documentation (README.md)
- **New DOCKER section** with build, run, and compose examples
- Examples reference the published image: `ghcr.io/tkhduracell/sonos-http-api:master`
- Added `docker pull` command for easy access to pre-built images
- Includes local build option for users who want to customize
- Includes notes on `--net=host` requirement for Sonos UPnP multicast discovery
- Both `docker run` and `docker-compose.yml` examples provided

### CI Workflow Improvements (.github/workflows/docker-push.yml)
- Added `type=sha` tag generation for commit-based tags
- Added `id: build` to build-push step for digest output
- Added summary step that outputs the final image digest
- These improvements enable users to reference images by their exact content hash

# Environment Variable Configuration Support

## Overview
Added support for configuring the Sonos HTTP API via environment variables, enabling flexible deployment across different environments without modifying configuration files.

## Changes

### Environment Variable Interpolation (lib/helpers/try-load-json.js)
- Added `interpolateEnvVars()` function to recursively process settings.json
- Supports `${ENV_VAR}` and `${ENV_VAR:-default}` syntax for string interpolation
- Automatically coerces single-expression variables to numbers (e.g., `${PORT}` → `8080` as number)
- Handles missing variables by logging warnings and returning original placeholder

### Environment Override Mechanism (settings.js)
- Added `SONOS_*` prefixed environment variable support for all top-level settings
- Converts `SONOS_SETTING_NAME` → `settingName` (snake_case to camelCase)
- Auto-coerces string values to booleans (`true`/`false`) and numbers as appropriate
- Takes highest priority: `SONOS_*` env vars override `settings.json` which overrides built-in defaults
- Enables containerized deployments (Docker, Kubernetes) without file modifications

### README Documentation (README.md)
- Added "Environment variables" section with clear examples
- Two usage patterns documented: interpolation in settings.json and SONOS_* overrides
- Complete reference table mapping 27 environment variables to settings keys
- Second table for nested settings requiring JSON5 interpolation (auth, https, service credentials)
- Docker example showing how to pass environment variables at runtime


# Docker Image Description Label

## Overview
Added OCI-compliant description label to the Docker image for visibility on container registries like GHCR.

## Changes

### Dockerfile
- Added `LABEL org.opencontainers.image.description` with the project description
- This label is automatically included in published images and displayed on GHCR package page
- Uses the description from package.json for consistency
