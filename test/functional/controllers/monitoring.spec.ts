import express from 'express';
import { promises } from 'fs';
import { statvfs } from '@wwa/statvfs';
import type { Environment } from '../../../src/lib/environment';
import monitoringController, { healthChecker } from '../../../src/controllers/monitoring';
import {
    checker200,
    checker503,
    goodStats,
    outOfInodesStats,
    outOfSpaceStats,
    sigtermResponse,
    spaceIssueResponse,
    uploadFolderIssueResponse,
} from './helpers';

jest.mock('@wwa/statvfs');
const mockedStatVFS = statvfs as jest.MockedFunction<typeof statvfs>;
const mockedAccess = jest.spyOn(promises, 'access');

const UPLOAD_PATH = '/fake';

let app: express.Express;

function buildApp(): express.Express {
    const fakeEnv: Environment = {
        NODE_ENV: 'staging',
        PORT: 3030,
        IDENTIGRAF_UPLOAD_FOLDER: UPLOAD_PATH,
        IDENTIGRAF_MAX_FILE_SIZE: 0,
    };

    const application = express();
    application.disable('x-powered-by');
    application.use('/monitoring', monitoringController(fakeEnv));
    return application;
}

beforeEach(() => {
    jest.resetAllMocks();
    app = buildApp();
    healthChecker.shutdownRequested = false;
});

afterEach(() => process.removeAllListeners('SIGTERM'));

describe('MonitoringController', () => {
    const checkCallExpectations = (): void => {
        expect(mockedStatVFS).toHaveBeenCalledTimes(1);
        expect(mockedStatVFS).toHaveBeenCalledWith(UPLOAD_PATH);
        expect(mockedAccess).toHaveBeenCalledTimes(1);
        expect(mockedAccess).toHaveBeenCalledWith(UPLOAD_PATH, expect.any(Number));
    };

    beforeEach(() => {
        mockedStatVFS.mockResolvedValue(goodStats);
        mockedAccess.mockResolvedValue();
    });

    describe('Liveness Check', () => {
        it('should succeed', () => checker200(app, 'live'));
        it('should fail when shutdown requested', () => {
            healthChecker.shutdownRequested = true;
            return checker503(app, 'live', sigtermResponse);
        });
    });

    describe('Readyness Check', () => {
        it('should succeed', () => checker200(app, 'ready'));
        it('should fail when shutdown requested', () => {
            healthChecker.shutdownRequested = true;
            return checker503(app, 'ready', sigtermResponse);
        });

        it('should fail when the system runs out of disk space', () => {
            mockedStatVFS.mockResolvedValue(outOfSpaceStats);
            return checker503(app, 'ready', spaceIssueResponse).then(checkCallExpectations);
        });

        it('should fail when the system runs out of inodes', () => {
            mockedStatVFS.mockResolvedValue(outOfInodesStats);
            return checker503(app, 'ready', spaceIssueResponse).then(checkCallExpectations);
        });

        it('should fail when statvfs() fails', () => {
            mockedStatVFS.mockRejectedValue(new Error('Failure'));
            return checker503(app, 'ready', spaceIssueResponse).then(checkCallExpectations);
        });

        it('should fail when the target directory is not writable', () => {
            mockedAccess.mockRejectedValue(new Error());
            return checker503(app, 'ready', uploadFolderIssueResponse).then(checkCallExpectations);
        });
    });

    describe('Health Check', () => {
        it('should succeed', () => checker200(app, 'health'));
        it('should fail when shutdown requested', () => {
            healthChecker.shutdownRequested = true;
            return checker503(app, 'health', sigtermResponse);
        });
    });
});
