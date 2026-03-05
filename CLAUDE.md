# Docker Documentation and CI Improvements

## Overview
Added comprehensive Docker usage documentation to the README and improved the CI workflow for building and publishing container images.

## Changes

### Docker Documentation (README.md)
- **New DOCKER section** with build, run, and compose examples
- Examples use SHA256 image digest references for reproducibility: `sha256:783d99d1340209439803c9535dbb44209e739a313653b09fa38b3c14dce30fa5`
- Includes notes on `--net=host` requirement for Sonos UPnP multicast discovery
- Both `docker run` and `docker-compose.yml` examples provided

### CI Workflow Improvements (.github/workflows/docker-push.yml)
- Added `type=sha` tag generation for commit-based tags
- Added `id: build` to build-push step for digest output
- Added summary step that outputs the final image digest
- These improvements enable users to reference images by their exact content hash

## Future Work
- Once CI successfully publishes images to ghcr.io, update README with actual remote digest
- The local digest shown in README will differ from CI-published digest (single vs multi-platform builds)
