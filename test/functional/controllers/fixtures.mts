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
