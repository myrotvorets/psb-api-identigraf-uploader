import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, type Request, type Response, json } from 'express';
import { installOpenApiValidator } from '@myrotvorets/oav-installer';
import { errorMiddleware, notFoundMiddleware } from '@myrotvorets/express-microservice-middlewares';
import { cleanUploadedFilesMiddleware } from '@myrotvorets/clean-up-after-multer';
import { createServer, getTracer, recordErrorToSpan } from '@myrotvorets/otel-utils';
import { memoryStorage } from 'multer';
import {
    type LoggerFromRequestFunction,
    errorLoggerHook,
    requestDurationMiddleware,
    requestLoggerMiddleware,
} from '@myrotvorets/express-otel-middlewares';

import { type LocalsWithContainer, initializeContainer, scopedContainerMiddleware } from './lib/container.mjs';
import { requestDurationHistogram } from './lib/otel.mjs';

import { uploadErrorHandlerMiddleware } from './middleware/upload.mjs';

import { downloadController } from './controllers/download.mjs';
import { monitoringController } from './controllers/monitoring.mjs';
import { uploadController } from './controllers/upload.mjs';

const loggerFromRequest: LoggerFromRequestFunction = (req: Request) =>
    (req.res as Response<never, LocalsWithContainer> | undefined)?.locals.container.resolve('logger');

export function configureApp(app: express.Express): ReturnType<typeof initializeContainer> {
    return getTracer().startActiveSpan('configureApp', (span): ReturnType<typeof initializeContainer> => {
        try {
            const container = initializeContainer();
            const env = container.resolve('environment');
            const base = dirname(fileURLToPath(import.meta.url));

            app.use(
                requestDurationMiddleware(requestDurationHistogram),
                scopedContainerMiddleware,
                requestLoggerMiddleware('identigraf-uploader', loggerFromRequest),
                json(),
            );

            app.use('/monitoring', monitoringController(env));

            app.use(
                installOpenApiValidator(join(base, 'specs', 'identigraf-uploader-private.yaml'), env.NODE_ENV, {
                    fileUploader: {
                        storage: env.NODE_ENV === 'test' ? memoryStorage() : /* c8 ignore next */ undefined,
                        dest: env.IDENTIGRAF_UPLOAD_FOLDER,
                        limits: {
                            fileSize: env.IDENTIGRAF_MAX_FILE_SIZE,
                        },
                    },
                }),
                uploadController(),
                downloadController(),
                notFoundMiddleware,
                cleanUploadedFilesMiddleware(),
                uploadErrorHandlerMiddleware,
                errorMiddleware({
                    beforeSendHook: errorLoggerHook(loggerFromRequest),
                }),
            );

            return container;
        } /* c8 ignore start */ catch (e) {
            recordErrorToSpan(e, span);
            throw e;
        } /* c8 ignore stop */ finally {
            span.end();
        }
    });
}

export function createApp(): Express {
    const app = express();
    app.set('strict routing', true);
    app.set('x-powered-by', false);
    app.set('trust proxy', true);
    app.set('case sensitive routing', true);
    return app;
}

/* c8 ignore start */
export async function run(): Promise<void> {
    const app = createApp();
    configureApp(app);
    await createServer(app);
}
/* c8 ignore stop */
