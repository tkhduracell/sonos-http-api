'use strict';
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');
const fileDuration = require('../helpers/file-duration');
const settings = require('../../settings');
const logger = require('sonos-discovery/lib/helpers/logger');

const DEFAULT_VOICE = 'Kore';
const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';
const SAMPLE_RATE = 24000;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

function writeWavFile(filepath, pcmBuffer) {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20);  // PCM format
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE / 8, 28);
  header.writeUInt16LE(NUM_CHANNELS * BITS_PER_SAMPLE / 8, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  fs.writeFileSync(filepath, Buffer.concat([header, pcmBuffer]));
}

function gemini(phrase, language) {
  if (!settings.geminiKey) {
    return Promise.resolve();
  }

  if (!language) {
    language = 'en';
  }

  const geminiSettings = settings.gemini || {};
  const voice = geminiSettings.voice || DEFAULT_VOICE;
  const model = geminiSettings.model || DEFAULT_MODEL;

  const phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  const filename = `gemini-${phraseHash}-${language}.wav`;
  const filepath = path.resolve(settings.webroot, 'tts', filename);
  const expectedUri = `/tts/${filename}`;

  try {
    fs.accessSync(filepath, fs.R_OK);
    return fileDuration(filepath)
      .then((duration) => {
        return { duration, uri: expectedUri };
      });
  } catch (err) {
    logger.info(`announce file for phrase "${phrase}" does not seem to exist, downloading from Gemini TTS`);
  }

  const postData = JSON.stringify({
    contents: [{ parts: [{ text: phrase }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice
          }
        }
      }
    }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${model}:generateContent`,
      method: 'POST',
      headers: {
        'x-goog-api-key': settings.geminiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Gemini TTS failed with status ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
          return;
        }

        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const audioData = body.candidates[0].content.parts[0].inlineData.data;
          const pcmBuffer = Buffer.from(audioData, 'base64');
          writeWavFile(filepath, pcmBuffer);
          resolve(expectedUri);
        } catch (err) {
          reject(new Error(`Failed to parse Gemini TTS response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  })
    .then(() => {
      return fileDuration(filepath);
    })
    .then((duration) => {
      return { duration, uri: expectedUri };
    });
}

module.exports = gemini;
