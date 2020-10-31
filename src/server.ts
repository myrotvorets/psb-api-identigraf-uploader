import express, { json } from 'express';
import { join } from 'path';
import { installOpenApiValidator } from '@myrotvorets/oav-installer';
import { errorMiddleware, notFoundMiddleware } from '@myrotvorets/express-microservice-middlewares';
import { cleanUploadedFilesMiddleware } from '@myrotvorets/clean-up-after-multer';
import { createServer } from '@myrotvorets/create-server';
import morgan from 'morgan';

import { environment } from './lib/environment';

import uploadController from './controllers/upload';
import monitoringController from './controllers/monitoring';
import { uploadErrorHandlerMiddleware } from './middleware/upload';

export async function configureApp(app: express.Express): Promise<void> {
    const env = environment();

    app.use(json());

    await installOpenApiValidator(join(__dirname, 'specs', 'identigraf-uploader.yaml'), app, env.NODE_ENV, {
        fileUploader: {
            dest: env.IDENTIGRAF_UPLOAD_FOLDER,
            limits: {
                fileSize: env.IDENTIGRAF_MAX_FILE_SIZE,
            },
        },
    });

    app.use(
        uploadController(),
        notFoundMiddleware,
        cleanUploadedFilesMiddleware(),
        uploadErrorHandlerMiddleware,
        errorMiddleware,
    );
}

/* istanbul ignore next */
export function setupApp(): express.Express {
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

/* istanbul ignore next */
export async function run(): Promise<void> {
    const [env, app] = [environment(), setupApp()];

    app.use('/monitoring', monitoringController(env));

    await configureApp(app);

    const server = await createServer(app);
    server.listen(env.PORT);
}
