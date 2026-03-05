'use strict';
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { z } = require('zod');

function createMcpServer(api, discovery) {
  function resolvePlayer(room) {
    if (room) {
      const player = discovery.getPlayer(room);
      if (!player) throw new Error(`Room "${room}" not found`);
      return player;
    }
    const player = discovery.getAnyPlayer();
    if (!player) throw new Error('No Sonos players discovered yet');
    return player;
  }

  function success(result) {
    const text = JSON.stringify(result ?? { status: 'success' }, null, 2);
    return { content: [{ type: 'text', text }] };
  }

  function getServer() {
    const server = new McpServer({
      name: 'sonos',
      version: '1.0.0',
    });

    server.tool('sonos_zones', 'List all Sonos zones and rooms', {}, async () => {
      const player = resolvePlayer();
      const result = await api.dispatch('zones', player, []);
      return success(result);
    });

    server.tool('sonos_state', 'Get playback state for a room', {
      room: z.string().describe('Room name'),
    }, async ({ room }) => {
      const player = resolvePlayer(room);
      const result = await api.dispatch('state', player, []);
      return success(result);
    });

    server.tool('sonos_play_control', 'Control playback', {
      room: z.string().describe('Room name'),
      action: z.enum(['play', 'pause', 'playpause', 'next', 'previous']).describe('Playback action'),
    }, async ({ room, action }) => {
      const player = resolvePlayer(room);
      const result = await api.dispatch(action, player, []);
      return success(result);
    });

    server.tool('sonos_seek', 'Seek to a position or track number', {
      room: z.string().describe('Room name'),
      type: z.enum(['time', 'track']).describe('Seek by time (HH:MM:SS) or track number'),
      value: z.string().describe('Time position (HH:MM:SS) or track number'),
    }, async ({ room, type, value }) => {
      const player = resolvePlayer(room);
      const action = type === 'time' ? 'timeseek' : 'trackseek';
      const result = await api.dispatch(action, player, [value]);
      return success(result);
    });

    server.tool('sonos_volume', 'Set volume', {
      room: z.string().describe('Room name'),
      level: z.number().min(0).max(100).describe('Volume level 0-100'),
      group: z.boolean().optional().describe('Apply to entire group'),
    }, async ({ room, level, group }) => {
      const player = resolvePlayer(room);
      const action = group ? 'groupvolume' : 'volume';
      const result = await api.dispatch(action, player, [String(level)]);
      return success(result);
    });

    server.tool('sonos_mute', 'Mute or unmute', {
      room: z.string().describe('Room name'),
      muted: z.boolean().describe('True to mute, false to unmute'),
      group: z.boolean().optional().describe('Apply to entire group'),
    }, async ({ room, muted, group }) => {
      let action;
      if (group) {
        action = muted ? 'groupmute' : 'groupunmute';
      } else {
        action = muted ? 'mute' : 'unmute';
      }
      const player = resolvePlayer(room);
      const result = await api.dispatch(action, player, []);
      return success(result);
    });

    server.tool('sonos_say', 'Text-to-speech announcement', {
      room: z.string().describe('Room name'),
      text: z.string().describe('Text to speak'),
      language: z.string().optional().describe('Language code (e.g. en-gb, fr-fr)'),
      volume: z.number().min(0).max(100).optional().describe('Announcement volume'),
    }, async ({ room, text, language, volume }) => {
      const player = resolvePlayer(room);
      const values = [encodeURIComponent(text)];
      if (language) values.push(language);
      if (volume != null) values.push(String(volume));
      const result = await api.dispatch('say', player, values);
      return success(result);
    });

    server.tool('sonos_favorite', 'Play a Sonos favorite', {
      room: z.string().describe('Room name'),
      name: z.string().describe('Favorite name'),
    }, async ({ room, name }) => {
      const player = resolvePlayer(room);
      const result = await api.dispatch('favorite', player, [encodeURIComponent(name)]);
      return success(result);
    });

    server.tool('sonos_playlist', 'Play a Sonos playlist', {
      room: z.string().describe('Room name'),
      name: z.string().describe('Playlist name'),
    }, async ({ room, name }) => {
      const player = resolvePlayer(room);
      const result = await api.dispatch('playlist', player, [encodeURIComponent(name)]);
      return success(result);
    });

    server.tool('sonos_group', 'Manage speaker groups', {
      room: z.string().describe('Room name'),
      action: z.enum(['join', 'add', 'isolate', 'ungroup', 'leave']).describe('Group action'),
      target_room: z.string().optional().describe('Target room for join/add'),
    }, async ({ room, action, target_room }) => {
      const player = resolvePlayer(room);
      const values = target_room ? [encodeURIComponent(target_room)] : [];
      const result = await api.dispatch(action, player, values);
      return success(result);
    });

    server.tool('sonos_sleep', 'Set or cancel sleep timer', {
      room: z.string().describe('Room name'),
      seconds: z.union([z.number().int().min(0), z.literal('off')]).describe('Seconds or "off"'),
    }, async ({ room, seconds }) => {
      const player = resolvePlayer(room);
      const result = await api.dispatch('sleep', player, [String(seconds)]);
      return success(result);
    });

    server.tool('sonos_command', 'Send any Sonos command', {
      room: z.string().optional().describe('Room name (omit for system-wide actions)'),
      action: z.string().describe('Action name (e.g. spotify, tunein, clip, favorites, playlists, shuffle, repeat, crossfade, nightmode, bass, treble, linein, reindex, clearqueue, queue)'),
      params: z.array(z.string()).optional().describe('Action parameters'),
    }, async ({ room, action, params }) => {
      const player = resolvePlayer(room);
      const result = await api.dispatch(action, player, params || []);
      return success(result);
    });

    return server;
  }

  return async function mcpHandler(req, res) {
    const server = getServer();
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
      res.on('close', () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        }));
      }
    }
  };
}

module.exports = createMcpServer;
