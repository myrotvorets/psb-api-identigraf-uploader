import type { access } from 'node:fs/promises';
import { afterEach, beforeEach, describe } from 'mocha';
import { expect } from 'chai';
import * as td from 'testdouble';
import express, { type Express } from 'express';
import request, { type Test } from 'supertest';
import type { statvfs } from '@wwa/statvfs';
import type * as monitor from '../../../src/controllers/monitoring.mjs';
import type { Environment } from '../../../src/lib/environment.mjs';
import {
    goodStats,
    outOfInodesStats,
    outOfSpaceStats,
    sigtermResponse,
    spaceIssueResponse,
    uploadFolderIssueResponse,
} from './fixtures.mjs';

const UPLOAD_PATH = '/somewhere';

const checker200 = (app: unknown, endpoint: string): Test =>
    request(app).get(`/monitoring/${endpoint}`).expect('Content-Type', /json/u).expect(200);

const checker503 = (app: unknown, endpoint: string, match: Record<string, unknown>): Test =>
    request(app)
        .get(`/monitoring/${endpoint}`)
        .expect('Content-Type', /json/u)
        .expect(503)
        .expect((res) => expect(res.body).to.be.an('object').and.containSubset(match));

describe('MonitoringController', () => {
    let app: Express;
    let monitoring: typeof monitor;
    const mockedAccess = td.function<typeof access>();
    const mockedStatVFS = td.function<typeof statvfs>();

    beforeEach(async () => {
        await td.replaceEsm('node:fs/promises', {
            access: mockedAccess,
            constants: {
                F_OK: 0,
                R_OK: 0,
                W_OK: 0,
            },
        });

        await td.replaceEsm('@wwa/statvfs', {
            statvfs: mockedStatVFS,
        });

        monitoring = await import('../../../src/controllers/monitoring.mjs');

        td.when(mockedAccess(UPLOAD_PATH, td.matchers.isA(Number) as number)).thenResolve();
        td.when(mockedStatVFS(UPLOAD_PATH)).thenResolve(goodStats);

        const fakeEnv: Environment = {
            NODE_ENV: 'staging',
            PORT: 3030,
            IDENTIGRAF_UPLOAD_FOLDER: UPLOAD_PATH,
            IDENTIGRAF_MAX_FILE_SIZE: 0,
        };

        app = express();
        app.disable('x-powered-by');
        app.use('/monitoring', monitoring.monitoringController(fakeEnv));
    });

    afterEach(() => process.removeAllListeners('SIGTERM'));

    const checkCallExpectations = (): void => {
        td.verify(mockedAccess(UPLOAD_PATH, td.matchers.isA(Number) as number), { times: 1 });
    };

    describe('Liveness Check', () => {
        it('should succeed', () => checker200(app, 'live'));
        it('should fail when shutdown requested', () => {
            monitoring.healthChecker.shutdownRequested = true;
            return checker503(app, 'live', sigtermResponse);
        });
    });

    describe('Readiness Check', () => {
        it('should succeed', () => checker200(app, 'ready'));
        it('should fail when shutdown requested', () => {
            monitoring.healthChecker.shutdownRequested = true;
            return checker503(app, 'ready', sigtermResponse);
        });

        it('should fail when the system runs out of disk space', () => {
            td.when(mockedStatVFS(UPLOAD_PATH)).thenResolve(outOfSpaceStats);
            return checker503(app, 'ready', spaceIssueResponse).then(checkCallExpectations);
        });

        it('should fail when the system runs out of inodes', () => {
            td.when(mockedStatVFS(UPLOAD_PATH)).thenResolve(outOfInodesStats);
            return checker503(app, 'ready', spaceIssueResponse).then(checkCallExpectations);
        });

        it('should fail when statvfs() fails', () => {
            td.when(mockedStatVFS(UPLOAD_PATH)).thenReject(new Error('Failure'));
            return checker503(app, 'ready', spaceIssueResponse).then(checkCallExpectations);
        });

        it('should fail when the target directory is not writable', () => {
            td.when(mockedAccess(UPLOAD_PATH, td.matchers.isA(Number) as number)).thenReject(new Error());
            return checker503(app, 'ready', uploadFolderIssueResponse);
        });
    });

    describe('Health Check', () => {
        it('should succeed', () => checker200(app, 'health'));
        it('should fail when shutdown requested', () => {
            monitoring.healthChecker.shutdownRequested = true;
            return checker503(app, 'health', sigtermResponse);
        });
    });
});
