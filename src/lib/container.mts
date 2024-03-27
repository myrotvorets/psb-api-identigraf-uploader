import { AwilixContainer, asClass, asFunction, asValue, createContainer } from 'awilix';
import type { NextFunction, Request, Response } from 'express';
import { type Logger, getLogger } from '@myrotvorets/otel-utils';
import { environment } from './environment.mjs';
import { DownloadService } from '../services/downloadservice.mjs';
import { FileService } from '../services/fileservice.mjs';
import { ImageService } from '../services/imageservice.mjs';
import { UploadService } from '../services/uploadservice.mjs';
import type { DownloadServiceInterface } from '../services/downloadserviceinterface.mjs';
import type { FileServiceInterface } from '../services/fileserviceinterface.mjs';
import type { ImageServiceInterface } from '../services/imageserviceinterface.mjs';
import type { UploadServiceInterface } from '../services/uploadserviceinterface.mjs';

export interface Container {
    environment: ReturnType<typeof environment>;
    logger: Logger;
    basePath: string;
    uploadService: UploadServiceInterface;
    downloadService: DownloadServiceInterface;
    imageService: ImageServiceInterface;
    fileService: FileServiceInterface;
}

export interface RequestContainer {
    req: Request;
}

export type LocalsWithContainer = Record<'container', AwilixContainer<RequestContainer & Container>>;

export const container = createContainer<Container>();

/* c8 ignore start */
function createLogger({ req }: Partial<RequestContainer>): Logger {
    const logger = getLogger();
    logger.clearAttributes();
    if (req) {
        if (req.ip) {
            logger.setAttribute('ip', req.ip);
        }

        logger.setAttribute('request', `${req.method} ${req.originalUrl}`);
    }

    return logger;
}
/* c8 ignore stop */

export function initializeContainer(): typeof container {
    const env = environment(true);
    container.register({
        environment: asValue(env),
        logger: asFunction(createLogger).scoped(),
        basePath: asValue(env.IDENTIGRAF_UPLOAD_FOLDER),
        uploadService: asClass(UploadService).singleton(),
        downloadService: asClass(DownloadService).singleton(),
        imageService: asClass(ImageService).singleton(),
        fileService: asClass(FileService).singleton(),
    });

    container.register('req', asValue(undefined));
    process.on('beforeExit', () => {
        container.dispose().catch((e: unknown) => console.error(e));
    });

    return container;
}

export function scopedContainerMiddleware(
    req: Request,
    res: Response<unknown, LocalsWithContainer>,
    next: NextFunction,
): void {
    res.locals.container = container.createScope<RequestContainer>();
    res.locals.container.register({
        req: asValue(req),
    });

    res.on('close', () => {
        void res.locals.container.dispose();
    });

    next();
}
