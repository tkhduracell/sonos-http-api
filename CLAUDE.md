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

## Future Work
- Once CI successfully publishes images to ghcr.io, update README to reference the GHCR image path

# MCP Server Integration

## Overview
Added a Model Context Protocol (MCP) server endpoint to the existing HTTP server, enabling AI assistants like Claude to control Sonos speakers directly through the `/mcp` endpoint.

## Changes

### New MCP Module (lib/mcp.js)
- Exports `createMcpServer(api, discovery)` function that initializes an MCP server with stateless HTTP transport
- Registers 12 MCP tools covering all common Sonos actions
- Uses `StreamableHTTPServerTransport` with JSON responses for simplicity (no streaming needed)
- Each request creates a new server instance (stateless mode)

### MCP Tools Registered
| Tool | Purpose |
|------|---------|
| `sonos_zones` | List all zones and rooms |
| `sonos_state` | Get playback state for a room |
| `sonos_play_control` | Play, pause, next, previous |
| `sonos_seek` | Seek by time (HH:MM:SS) or track number |
| `sonos_volume` | Set volume for room or entire group |
| `sonos_mute` | Mute/unmute room or group |
| `sonos_say` | Text-to-speech announcement with language/volume |
| `sonos_favorite` | Play Sonos favorite by name |
| `sonos_playlist` | Play Sonos playlist by name |
| `sonos_group` | Manage speaker groups (join, add, isolate) |
| `sonos_sleep` | Set or cancel sleep timer |
| `sonos_command` | Generic escape hatch for any unsupported action |

### HTTP Server Integration (server.js)
- Imported and initialized `createMcpServer(api, discovery)` at startup
- MCP endpoint must be routed **before** `serve-static` middleware to preserve request body
- Added `/mcp` handler with proper CORS headers and OPTIONS support
- Stateless request/response model: each POST creates new transport & server, cleans up on close

### Public Dispatch Method (lib/sonos-http-api.js)
- Added `this.dispatch(action, player, values)` public method to expose private `handleAction()`
- Enables MCP server to call actions programmatically without HTTP overhead

### Dependencies Added (package.json)
- `@modelcontextprotocol/sdk` — MCP protocol implementation
- `zod` — JSON schema validation for tool parameters

### Documentation (README.md)
- Added "MCP SERVER" section with tool table and usage instructions
- Provided Claude Code setup: `claude mcp add sonos --transport http http://localhost:5005/mcp`
- Provided Claude Desktop config example for `claude_desktop_config.json`
- Listed all 12 available tools with descriptions

## Usage
After starting the server with `node server.js`, configure your MCP client:

**Claude Code:**
```
claude mcp add sonos --transport http http://localhost:5005/mcp
```

**Claude Desktop:**
```json
{
  "mcpServers": {
    "sonos": {
      "type": "url",
      "url": "http://localhost:5005/mcp"
    }
  }
}
```

## Technical Notes
- MCP endpoint accepts `POST /mcp` with JSON-RPC messages
- Requires `Accept: application/json, text/event-stream` header (MCP protocol requirement)
- Response Content-Type is `application/json` when `enableJsonResponse: true`
- No session management needed (stateless HTTP model)
- TTS audio files are served by existing static file server on the same port
- All tool inputs are properly URL-encoded before dispatch to handle special characters in room names

# Docker Image Description Label

## Overview
Added OCI-compliant description label to the Docker image for visibility on container registries like GHCR.

## Changes

### Dockerfile
- Added `LABEL org.opencontainers.image.description` with the project description
- This label is automatically included in published images and displayed on GHCR package page
- Uses the description from package.json for consistency
