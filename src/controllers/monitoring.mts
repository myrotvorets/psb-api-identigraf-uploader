import { constants } from 'node:fs';
import {
    HealthChecker,
    HealthEndpoint,
    LivenessEndpoint,
    ReadinessCheck,
    ReadinessEndpoint,
    ShutdownCheck,
} from '@cloudnative/health-connect';
import { Router } from 'express';
import { addJsonContentTypeMiddleware } from '@myrotvorets/express-microservice-middlewares';
import type { Environment } from '../lib/environment.mjs';
import { container } from '../lib/container.mjs';

export const healthChecker = new HealthChecker();

export function monitoringController(env: Pick<Environment, 'IDENTIGRAF_UPLOAD_FOLDER'>): Router {
    const router = Router();

    const dirCheck = new ReadinessCheck(
        'upload folder',
        (): Promise<void> =>
            container
                .resolve('fileService')
                .access(env.IDENTIGRAF_UPLOAD_FOLDER, constants.F_OK | constants.R_OK | constants.W_OK),
    );

    const diskSpaceCheck = new ReadinessCheck('free disk space', async (): Promise<void> => {
        const fileService = container.resolve('fileService');
        const stats = await fileService.statvfs(env.IDENTIGRAF_UPLOAD_FOLDER);
        if (stats.blocks && stats.bavail * stats.bsize < 1048576) {
            throw new Error('Too few free disk space');
        }

        if (stats.files && stats.ffree < 1000) {
            throw new Error('Too few free inodes');
        }
    });

    const shutdownCheck = new ShutdownCheck('SIGTERM', (): Promise<void> => Promise.resolve());

    healthChecker.registerReadinessCheck(dirCheck);
    healthChecker.registerReadinessCheck(diskSpaceCheck);
    healthChecker.registerShutdownCheck(shutdownCheck);

    router.use(addJsonContentTypeMiddleware);
    router.get('/live', LivenessEndpoint(healthChecker));
    router.get('/ready', ReadinessEndpoint(healthChecker));
    router.get('/health', HealthEndpoint(healthChecker));

    return router;
}
