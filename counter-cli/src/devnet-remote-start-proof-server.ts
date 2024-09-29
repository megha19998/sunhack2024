import { createLogger } from './logger-utils.js';
import { run } from './cli';
import { currentDir, DevnetRemoteConfig } from './config';
import { DockerComposeEnvironment, Wait } from 'testcontainers';
import path from 'node:path';

const config = new DevnetRemoteConfig();
const dockerEnv = new DockerComposeEnvironment(path.resolve(currentDir, '..'), 'proof-server.yml').withWaitStrategy(
  'proof-server',
  Wait.forLogMessage('Actix runtime found; starting in Actix runtime', 1),
);
const logger = await createLogger(config.logDir);
await run(config, logger, dockerEnv);
