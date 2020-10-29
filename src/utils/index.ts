import { promises } from 'fs';

export async function unlink(path: string): Promise<void> {
    try {
        await promises.unlink(path);
    } catch (e) {
        console.warn(`Failed to unlink ${path}:`, e);
    }
}
