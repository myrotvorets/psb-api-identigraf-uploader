import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express, json, static as staticMiddleware } from 'express';
import { installOpenApiValidator } from '@myrotvorets/oav-installer';
import { errorMiddleware, notFoundMiddleware } from '@myrotvorets/express-microservice-middlewares';
import { cleanUploadedFilesMiddleware } from '@myrotvorets/clean-up-after-multer';
import { createServer } from '@myrotvorets/create-server';
import morgan from 'morgan';
import { memoryStorage } from 'multer';
import { logs } from '@opentelemetry/api-logs';

import { environment } from './lib/environment.mjs';

import { uploadController } from './controllers/upload.mjs';
import { monitoringController } from './controllers/monitoring.mjs';
import { uploadErrorHandlerMiddleware } from './middleware/upload.mjs';

export async function configureApp(app: express.Express): Promise<void> {
    const env = environment();

    /* c8 ignore start */
    if (env.NODE_ENV !== 'production') {
        app.use(
            '/specs/',
            staticMiddleware(join(dirname(fileURLToPath(import.meta.url)), 'specs'), {
                acceptRanges: false,
                index: false,
            }),
        );

        if (process.env.HAVE_SWAGGER === 'true') {
            app.get('/', (_req, res) => res.redirect('/swagger/'));
        }
    }
    /* c8 ignore end */

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

    app.use((req, res, next) => {
        const logger = logs.getLogger('default');
        logger.emit({
            body: `${req.method} ${req.url} ${req.ip}`,
        });
        next();
    });

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
