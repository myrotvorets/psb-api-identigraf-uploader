import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, json } from 'express';
import { installOpenApiValidator } from '@myrotvorets/oav-installer';
import { errorMiddleware, notFoundMiddleware } from '@myrotvorets/express-microservice-middlewares';
import { cleanUploadedFilesMiddleware } from '@myrotvorets/clean-up-after-multer';
import { createServer, getTracer, recordErrorToSpan } from '@myrotvorets/otel-utils';
import { memoryStorage } from 'multer';

import { initializeContainer, scopedContainerMiddleware } from './lib/container.mjs';
import { uploadErrorHandlerMiddleware } from './middleware/upload.mjs';
import { requestDurationMiddleware } from './middleware/duration.mjs';
import { loggerMiddleware } from './middleware/logger.mjs';

import { downloadController } from './controllers/download.mjs';
import { monitoringController } from './controllers/monitoring.mjs';
import { uploadController } from './controllers/upload.mjs';

export function configureApp(app: express.Express): ReturnType<typeof initializeContainer> {
    return getTracer().startActiveSpan('configureApp', (span): ReturnType<typeof initializeContainer> => {
        try {
            const container = initializeContainer();
            const env = container.resolve('environment');
            const base = dirname(fileURLToPath(import.meta.url));

            app.use(requestDurationMiddleware, scopedContainerMiddleware, loggerMiddleware, json());
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
                errorMiddleware(),
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
