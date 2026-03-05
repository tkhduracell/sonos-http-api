const fs = require('fs');
const JSON5 = require('json5');
const logger = require('sonos-discovery/lib/helpers/logger');

const ENV_VAR_PATTERN = /\$\{([^}]+)\}/g;

function interpolateEnvVars(obj) {
  if (Array.isArray(obj)) {
    return obj.map(interpolateEnvVars);
  }
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = interpolateEnvVars(obj[key]);
    }
    return result;
  }
  if (typeof obj === 'string' && obj.includes('${')) {
    const interpolated = obj.replace(ENV_VAR_PATTERN, (match, expr) => {
      const [varName, ...defaultParts] = expr.split(':-');
      const defaultValue = defaultParts.join(':-');
      const envValue = process.env[varName];
      if (envValue !== undefined) return envValue;
      if (defaultParts.length > 0) return defaultValue;
      logger.warn(`Environment variable ${varName} is not set and has no default`);
      return match;
    });
    // Coerce to number if the entire string was a single expression
    if (/^\$\{[^}]+\}$/.test(obj) && interpolated !== obj) {
      const num = Number(interpolated);
      if (!isNaN(num) && interpolated.trim() !== '') return num;
    }
    return interpolated;
  }
  return obj;
}

function tryLoadJson(path) {
  try {
    const fileContent = fs.readFileSync(path);
    const parsedContent = JSON5.parse(fileContent);
    return interpolateEnvVars(parsedContent);
  } catch (e) {
    if (e.code === 'ENOENT') {
      logger.info(`Could not find file ${path}`);
    } else {
      logger.warn(`Could not read file ${path}, ignoring.`, e);
    }
  }
  return {};
}

module.exports = tryLoadJson;