import { chromium, firefox } from 'playwright';
import handler from 'serve-handler'
import http from 'http'

(async () => {
    // Setup
    const server = http.createServer((request, response) => {
        return handler(request, response, {
            public: './test/dist'
        });
    });
    await new Promise((resolve) => {
        server.listen(3000, () => {
            resolve()
        });
    })

    const failTestCases = []

    for (const lancher of [chromium, firefox]) {
        const browser = await lancher.launch();
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            console.log('Testing using ' + lancher.name())

            await page.goto('http://127.0.0.1:3000');
            await page.waitForSelector('.test-result', {
                timeout: 30 * 1000,
            })
            const fail$Els = await page.$$('[data-case-fail]')
            for (const $el of fail$Els) {
                const text = await $el.innerText();
                failTestCases.push([lancher.name(), text])
            }
        } finally {
            // Teardown
            await context.close();
            await browser.close();
        }
    }

    server.close();
    if (failTestCases.length === 0) {
        console.log('All test cases pass!');
    } else {
        console.error('Some test cases fail!\n');
        for (const [name, text] of failTestCases) {
            console.error(`[${name}] ${text}`);
        }

        throw Error('Fail');
    }
})();