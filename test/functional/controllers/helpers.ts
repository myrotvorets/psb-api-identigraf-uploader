import request from 'supertest';
import type { NoParamCallback, PathLike } from 'fs';
import type { VFSStats } from '@wwa/statvfs';

export function accessCallbackSuccess(path: PathLike, mode: number | undefined, callback: NoParamCallback): void;
export function accessCallbackSuccess(path: PathLike, callback: NoParamCallback): void;
export function accessCallbackSuccess(
    path: PathLike,
    mode: number | undefined | NoParamCallback,
    callback?: NoParamCallback,
): void {
    const cb = (typeof mode === 'function' ? mode : callback) as NoParamCallback;
    cb(null);
}

export function accessCallbackFailure(path: PathLike, mode: number | undefined, callback: NoParamCallback): void;
export function accessCallbackFailure(path: PathLike, callback: NoParamCallback): void;
export function accessCallbackFailure(
    path: PathLike,
    mode: number | undefined | NoParamCallback,
    callback?: NoParamCallback,
): void {
    const cb = (typeof mode === 'function' ? mode : callback) as NoParamCallback;
    cb(new Error());
}

export const goodStats: VFSStats = {
    type: 0,
    bfree: 10000,
    bavail: 10000,
    blocks: 10000,
    bsize: 4096,
    files: 10000,
    ffree: 10000,
};

export const outOfSpaceStats: VFSStats = {
    type: 0,
    bfree: 10000,
    bavail: 10,
    blocks: 10000,
    bsize: 4096,
    files: 10000,
    ffree: 10000,
};

export const outOfIndoesStats: VFSStats = {
    type: 0,
    bfree: 10000,
    bavail: 10000,
    blocks: 10000,
    bsize: 4096,
    files: 10000,
    ffree: 10,
};

export const sigtermResponse = {
    status: 'STOPPED',
    checks: expect.arrayContaining([expect.objectContaining({ name: 'SIGTERM', state: 'STOPPED' })]) as unknown,
};

export const uploadFolderIssueResponse = {
    status: 'DOWN',
    checks: expect.arrayContaining([expect.objectContaining({ name: 'upload folder', state: 'DOWN' })]) as unknown,
};

export const spaceIssueResponse = {
    status: 'DOWN',
    checks: expect.arrayContaining([expect.objectContaining({ name: 'free disk space', state: 'DOWN' })]) as unknown,
};

export const checker200 = (app: unknown, endpoint: string): request.Test =>
    request(app)
        .get(`/monitoring/${endpoint}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/u)
        .expect(200);

export const checker503 = (app: unknown, endpoint: string, match?: Record<string, unknown>): Promise<unknown> =>
    request(app)
        .get(`/monitoring/${endpoint}`)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/u)
        .expect((res): void => {
            expect(res.body).toEqual(expect.objectContaining(match ?? {}));
        })
        .expect(503);
