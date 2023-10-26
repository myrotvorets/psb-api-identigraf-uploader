import type { access } from 'node:fs/promises';
import { expect } from 'chai';
import { type TestDouble, func, matchers, replaceEsm, verify, when } from 'testdouble';
import { type Express } from 'express';
import request, { type Test } from 'supertest';
import type { statvfs } from '@wwa/statvfs';
import type * as monitor from '../../../src/controllers/monitoring.mjs';
import { container } from '../../../src/lib/container.mjs';
import {
    goodStats,
    outOfInodesStats,
    outOfSpaceStats,
    sigtermResponse,
    spaceIssueResponse,
    uploadFolderIssueResponse,
} from './fixtures.mjs';

const UPLOAD_PATH = process.env['IDENTIGRAF_UPLOAD_FOLDER']!;

const checker200 = (app: unknown, endpoint: string): Test =>
    request(app).get(`/monitoring/${endpoint}`).expect('Content-Type', /json/u).expect(200);

const checker503 = (app: unknown, endpoint: string, match: Record<string, unknown>): Test =>
    request(app)
        .get(`/monitoring/${endpoint}`)
        .expect('Content-Type', /json/u)
        .expect(503)
        .expect((res) => expect(res.body).to.be.an('object').and.containSubset(match));

describe('MonitoringController', function () {
    let app: Express;
    let monitoring: typeof monitor;
    let mockedAccess: TestDouble<typeof access>;
    let mockedStatVFS: TestDouble<typeof statvfs>;

    before(async function () {
        await container.dispose();
        mockedAccess = func<typeof access>();
        mockedStatVFS = func<typeof statvfs>();
    });

    beforeEach(async function () {
        const origPromises = await import('node:fs/promises');
        await replaceEsm('node:fs/promises', {
            ...origPromises,
            access: mockedAccess,
        });

        await replaceEsm('@wwa/statvfs', {
            statvfs: mockedStatVFS,
        });

        when(mockedAccess(UPLOAD_PATH, matchers.isA(Number) as number)).thenResolve();
        when(mockedStatVFS(UPLOAD_PATH)).thenResolve(goodStats);

        monitoring = await import('../../../src/controllers/monitoring.mjs');
        const { configureApp, createApp } = await import('../../../src/server.mjs');
        app = createApp();
        configureApp(app);
    });

    afterEach(function () {
        return process.removeAllListeners('SIGTERM');
    });

    const checkCallExpectations = (): void => {
        verify(mockedAccess(UPLOAD_PATH, matchers.isA(Number) as number), { times: 1 });
    };

    describe('Liveness Check', function () {
        it('should succeed', function () {
            return checker200(app, 'live');
        });

        it('should fail when shutdown requested', function () {
            monitoring.healthChecker.shutdownRequested = true;
            return checker503(app, 'live', sigtermResponse);
        });
    });

    describe('Readiness Check', function () {
        it('should succeed', function () {
            return checker200(app, 'ready');
        });

        it('should fail when shutdown requested', function () {
            monitoring.healthChecker.shutdownRequested = true;
            return checker503(app, 'ready', sigtermResponse);
        });

        it('should fail when the system runs out of disk space', function () {
            when(mockedStatVFS(UPLOAD_PATH)).thenResolve(outOfSpaceStats);
            return checker503(app, 'ready', spaceIssueResponse).then(checkCallExpectations);
        });

        it('should fail when the system runs out of inodes', function () {
            when(mockedStatVFS(UPLOAD_PATH)).thenResolve(outOfInodesStats);
            return checker503(app, 'ready', spaceIssueResponse).then(checkCallExpectations);
        });

        it('should fail when statvfs() fails', function () {
            when(mockedStatVFS(UPLOAD_PATH)).thenReject(new Error('Failure'));
            return checker503(app, 'ready', spaceIssueResponse).then(checkCallExpectations);
        });

        it('should fail when the target directory is not writable', function () {
            when(mockedAccess(UPLOAD_PATH, matchers.isA(Number) as number)).thenReject(new Error());
            return checker503(app, 'ready', uploadFolderIssueResponse);
        });
    });

    describe('Health Check', function () {
        it('should succeed', function () {
            return checker200(app, 'health');
        });

        it('should fail when shutdown requested', function () {
            monitoring.healthChecker.shutdownRequested = true;
            return checker503(app, 'health', sigtermResponse);
        });
    });
});
