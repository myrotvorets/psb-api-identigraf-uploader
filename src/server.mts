import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, json } from 'express';
import { installOpenApiValidator } from '@myrotvorets/oav-installer';
import { errorMiddleware, notFoundMiddleware } from '@myrotvorets/express-microservice-middlewares';
import { cleanUploadedFilesMiddleware } from '@myrotvorets/clean-up-after-multer';
import { createServer } from '@myrotvorets/create-server';
import morgan from 'morgan';
import { memoryStorage } from 'multer';

import { environment } from './lib/environment.mjs';

import { uploadController } from './controllers/upload.mjs';
import { monitoringController } from './controllers/monitoring.mjs';
import { uploadErrorHandlerMiddleware } from './middleware/upload.mjs';

export async function configureApp(app: express.Express): Promise<void> {
    const env = environment();

    app.use(json());

    await installOpenApiValidator(
        join(dirname(fileURLToPath(import.meta.url)), 'specs', 'identigraf-uploader.yaml'),
        app,
        env.NODE_ENV,
        {
            fileUploader: {
                storage: env.NODE_ENV === 'test' ? memoryStorage() : /* c8 ignore next */ undefined,
                dest: env.IDENTIGRAF_UPLOAD_FOLDER,
                limits: {
                    fileSize: env.IDENTIGRAF_MAX_FILE_SIZE,
                },
            },
        },
    );

    app.use(
        uploadController(),
        notFoundMiddleware,
        cleanUploadedFilesMiddleware(),
        uploadErrorHandlerMiddleware,
        errorMiddleware,
    );
}

/* c8 ignore start */
export function setupApp(): Express {
    const app = express();
    app.set('strict routing', true);
    app.set('x-powered-by', false);

    app.use(
        morgan(
            '[PSBAPI-identigraf-uploader] :req[X-Request-ID]\t:method\t:url\t:status :res[content-length]\t:date[iso]\t:response-time\t:total-time',
        ),
    );

    return app;
}

export async function run(): Promise<void> {
    const [env, app] = [environment(), setupApp()];

    app.use('/monitoring', monitoringController(env));

    await configureApp(app);

    const server = await createServer(app);
    server.listen(env.PORT);
}
/* c8 ignore end */
