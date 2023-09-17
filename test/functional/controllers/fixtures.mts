import type { VFSStats } from '@wwa/statvfs';

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

export const outOfInodesStats: VFSStats = {
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
    checks: [{ name: 'SIGTERM', state: 'STOPPED' }],
};

export const uploadFolderIssueResponse = {
    status: 'DOWN',
    checks: [{ name: 'upload folder', state: 'DOWN' }],
};

export const spaceIssueResponse = {
    status: 'DOWN',
    checks: [{ name: 'free disk space', state: 'DOWN' }],
};
