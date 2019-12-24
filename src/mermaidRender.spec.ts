import unified from 'unified';
import markdown from 'remark-parse';
import stringifyMarkdown from 'remark-stringify';
import { VFile } from 'vfile';
import { mermaidRender, has } from './mermaidRender';
import recommended from 'remark-preset-lint-recommended';

const egfile = `
Hello world!
${"```"}mermaid file=example.svg name=Example_Diagram
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
${"```"}

World, hello!
`

const produces = `
Hello world!

![Example_Diagram]
[Example_Diagram]: example.svg

World, hello!
`

describe.each([
    [egfile, produces]
])("input: %s; output: %s", (input: string, output: string) => {
    test('parse correctly', async () => {
        const processor = unified()
            .use(markdown)
            .use(recommended)
            .use(mermaidRender)
            .use(stringifyMarkdown);

        const outS =
            await new Promise<string>
                ((ok, fail) => processor.process(input, (e: Error | null, o: VFile ): void => {
                if (e) return fail(e);
                return ok(o.contents.toString());
            }));

        expect(outS).toEqual(output)
    })
});

describe.each([
    [{cool: 1, fool: 2, bool: true}, {cool: 1}, true],
    [{cool: 1, fool: 2, bool: true}, {cool: true}, false],
    [{cool: 1, fool: 2, bool: true}, {fool: 2}, true],
    [{cool: 1, fool: 2, bool: true}, {cool: 1, fool: 2}, true],
    [{cool: 1, fool: 2, bool: true}, {cool: 1, fool: 2, bool: true}, true]
])("(%s == %s) should be %s", (haystack, needle, expected) => {
    expect(has(haystack, needle)).toBe(expected)
});