import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
    concurrency: 10,
    nodeResolve: true,
    files: 'test/**/*.test.ts',
    rootDir: './',
    browsers: [
        playwrightLauncher({ product: 'chromium' }),
        playwrightLauncher({ product: 'firefox' }),
    ],
    plugins: [
        esbuildPlugin({ ts: true }),
    ],
};
