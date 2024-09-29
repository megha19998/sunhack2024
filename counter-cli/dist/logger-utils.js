import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import pinoPretty from 'pino-pretty';
import pino from 'pino';
import { createWriteStream } from 'node:fs';
export const createLogger = async (logPath) => {
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    const pretty = pinoPretty({
        colorize: true,
        sync: true,
    });
    const level = 'info';
    return pino({
        level,
        depthLimit: 20,
    }, pino.multistream([
        { stream: pretty, level: 'info' },
        { stream: createWriteStream(logPath), level },
    ]));
};
//# sourceMappingURL=logger-utils.js.map