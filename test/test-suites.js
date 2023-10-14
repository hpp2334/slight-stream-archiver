const testCases = []

export function describe(title, fn) {
    testCases.push([title, fn])
}


const results = []

function attachResultsToPage() {
    const hasFail = results.filter(item => !item.success).length;

    const testResultEl = document.createElement('div')
    testResultEl.classList.add('test-result')
    document.body.append(testResultEl)

    testResultEl.append(document.createTextNode('TEST RESULT'))
    testResultEl.append(document.createElement('br'))
    if (results.length === 0) {
        testResultEl.append(document.createTextNode('EMPTY CASES'))
        return;
    }

    for (const { title, success, error } of results) {
        const testCaseEl = document.createElement('div')
        if (!success) {
            testCaseEl.setAttribute('data-case-fail', true)
        }

        testCaseEl.append(document.createTextNode(`${success ? '√' : '×'} ${title}`))

        if (error) {
            const stackErrorEl = document.createElement('div')
            stackErrorEl.style.paddingLeft = '20px'
            let msg = ''
            if (error instanceof Error) {
                msg = `ERROR: ${error.message}\nStack: ${error.stack}\n`
            } else {
                msg = `ERROR: ${error}\n`
            }
            stackErrorEl.innerText = msg

            testCaseEl.append(stackErrorEl)
            testCaseEl.append(document.createElement('br'))
        }
        testResultEl.append(testCaseEl)
    }
}

export async function runAllTests() {
    for (const [title, fn] of testCases) {
        try {
            await fn()
            results.push({
                title,
                success: true,
            })
        } catch (e) {
            results.push({
                title,
                success: false,
                error: e,
            })
        }
    }

    attachResultsToPage(results)
}
