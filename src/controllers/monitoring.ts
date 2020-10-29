import {
    HealthChecker,
    HealthEndpoint,
    LivenessEndpoint,
    ReadinessCheck,
    ReadinessEndpoint,
    ShutdownCheck,
} from '@cloudnative/health-connect';
import { Router } from 'express';
import { constants, promises } from 'fs';
import { addJsonContentTypeMiddleware } from '@myrotvorets/express-microservice-middlewares';
import { statvfs } from '@wwa/statvfs';
import { Environment } from '../lib/environment';

export let healthChecker = new HealthChecker();

const { access } = promises;

export default function (env: Environment): Router {
    const router = Router();

    const dirCheck = new ReadinessCheck(
        'upload folder',
        (): Promise<void> => {
            const path = env.IDENTIGRAF_UPLOAD_FOLDER;
            return access(path, constants.F_OK | constants.R_OK | constants.W_OK);
        },
    );

    const diskSpaceCheck = new ReadinessCheck(
        'free disk space',
        (): Promise<void> => {
            const path = env.IDENTIGRAF_UPLOAD_FOLDER;
            return statvfs(path).then((stats) => {
                if (stats.blocks && stats.bavail * stats.bsize < 1048576) {
                    return Promise.reject(new Error('Too few free disk space'));
                }

                if (stats.files && stats.ffree < 1000) {
                    return Promise.reject(new Error('Too few free inodes'));
                }

                return Promise.resolve();
            });
        },
    );

    const shutdownCheck = new ShutdownCheck('SIGTERM', (): Promise<void> => Promise.resolve());

    healthChecker = new HealthChecker();
    healthChecker.registerReadinessCheck(dirCheck);
    healthChecker.registerReadinessCheck(diskSpaceCheck);
    healthChecker.registerShutdownCheck(shutdownCheck);

    router.use(addJsonContentTypeMiddleware);
    router.get('/live', LivenessEndpoint(healthChecker));
    router.get('/ready', ReadinessEndpoint(healthChecker));
    router.get('/health', HealthEndpoint(healthChecker));

    return router;
}
