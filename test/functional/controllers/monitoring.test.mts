import { expect } from 'chai';
import { type Express } from 'express';
import request, { type Test } from 'supertest';
import { asClass } from 'awilix';
import { mock } from 'node:test';
import { container } from '../../../src/lib/container.mjs';
import { healthChecker } from '../../../src/controllers/monitoring.mjs';
import { configureApp, createApp } from '../../../src/server.mjs';
import { sigtermResponse, spaceIssueResponse, uploadFolderIssueResponse } from './fixtures.mjs';
import { outOfInodesStats, outOfSpaceStats } from '../../fixtures/vfsstats.mjs';
import { FakeFileService, accessMock, statvfsMock } from '../../mocks/fakefileservice.mjs';

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

    beforeEach(async function () {
        await container.dispose();
        app = createApp();
        configureApp(app);
        container.register('fileService', asClass(FakeFileService).singleton());
        healthChecker.shutdownRequested = false;
    });

    afterEach(function () {
        mock.reset();
        process.removeAllListeners('SIGTERM');
    });

    describe('Liveness Check', function () {
        it('should succeed', function () {
            return checker200(app, 'live');
        });

        it('should fail when shutdown requested', function () {
            healthChecker.shutdownRequested = true;
            return checker503(app, 'live', sigtermResponse);
        });
    });

    describe('Readiness Check', function () {
        it('should succeed', function () {
            return checker200(app, 'ready');
        });

        it('should fail when shutdown requested', function () {
            healthChecker.shutdownRequested = true;
            return checker503(app, 'ready', sigtermResponse);
        });

        it('should fail when the system runs out of disk space', function () {
            statvfsMock.mock.mockImplementationOnce(() => Promise.resolve(outOfSpaceStats));
            return checker503(app, 'ready', spaceIssueResponse);
        });

        it('should fail when the system runs out of inodes', function () {
            statvfsMock.mock.mockImplementationOnce(() => Promise.resolve(outOfInodesStats));
            return checker503(app, 'ready', spaceIssueResponse);
        });

        it('should fail when statvfs() fails', function () {
            statvfsMock.mock.mockImplementationOnce(() => Promise.reject(new Error('Failure')));
            return checker503(app, 'ready', spaceIssueResponse);
        });

        it('should fail when the target directory is not writable', function () {
            accessMock.mock.mockImplementationOnce(() => Promise.reject(new Error()));
            return checker503(app, 'ready', uploadFolderIssueResponse);
        });
    });

    describe('Health Check', function () {
        it('should succeed', function () {
            return checker200(app, 'health');
        });

        it('should fail when shutdown requested', function () {
            healthChecker.shutdownRequested = true;
            return checker503(app, 'health', sigtermResponse);
        });
    });
});
