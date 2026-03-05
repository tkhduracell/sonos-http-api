# Docker Documentation and CI Improvements

## Overview
Added comprehensive Docker usage documentation to the README and improved the CI workflow for building and publishing container images.

## Changes

### Docker Documentation (README.md)
- **New DOCKER section** with build, run, and compose examples
- Examples use the `latest` tag for simplicity
- Includes notes on `--net=host` requirement for Sonos UPnP multicast discovery
- Both `docker run` and `docker-compose.yml` examples provided

### CI Workflow Improvements (.github/workflows/docker-push.yml)
- Added `type=sha` tag generation for commit-based tags
- Added `id: build` to build-push step for digest output
- Added summary step that outputs the final image digest
- These improvements enable users to reference images by their exact content hash

## Future Work
- Once CI successfully publishes images to ghcr.io, update README to reference the GHCR image path
