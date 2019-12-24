import puppeteer from 'puppeteer';
import { Config as renderMermaidConfig, renderMermaid }
    from 'mermaid-render';
import { writeFile } from 'fs';
import { promisify } from 'util';
import path from 'path';
import { VFile } from 'vfile';
import * as mdast from './mdast';
import unist from 'unist';
import unified from 'unified';

export interface RemarkMermaidOptions extends renderMermaidConfig {}
type Options = RemarkMermaidOptions

type Eventually<T> = T | Promise<T>

export const has =
    <T1 extends Record<string, any>, T2 extends Record<string,any>>(v1: T1, v2: T2): v1 is (T1 & T2) => 
        Object.keys(v2).every(k => v1[k]===v2[k])
 

const contains =
    <T1, T2 extends keyof T1>(v1: T1, ...v2: Array<T2>): v1 is T1 & Readonly<{
        [k in T2]-?: Exclude<T1[k], undefined>
    }> => v2.every(k => k in v1);

const mustRoot =
    (nd: unist.Node): mdast.Root => {
        if (nd.type !== "root") throw new Error(`${nd.type} is not root`);
        return nd as mdast.Root
    }

interface mermaid extends unified.Plugin<[Partial<Options>?]> { };

export const mermaidRender: mermaid = 
    (options?: Options) => {
        const transformer = mermaidGuardless(options);
        return async (node: unist.Node, file: VFile):
            Promise<unist.Node> =>
            transformer(mustRoot(node), file)
 
    }


export const mermaidGuardless =
(options: Options = {}) => {

    const browser = options.browser ??
        puppeteer.launch({
            // allow wsl
            args: ["--no-sandbox"]
        });


    return async (ast: mdast.Root, file: VFile) => {
        const resp = await _transformer(ast, {...options, file, browser});
        if (resp instanceof Array) throw new Error("this should never happen");
        return resp;
    }
}

interface TransformerOptions extends Options {
    browser: Eventually<puppeteer.Browser>
    file: VFile
}

export interface TargetNode extends mdast.Code {
    lang: "mermaid",
    meta: string
}

export type Metadata = {
    /** the file to render to */
    file: string,
    /** the name of the defined identifier
     * e.g. name = "ok"
     * produces [ok]: ./my/file.svg
     */
    name: string,
    /** the optional title alt text
     * for the rendered image resource
     */
    alt?: string
}


interface ParsedMermaidBlock<
    file extends Metadata["file"] = Metadata["file"],
    name extends Metadata["name"] = Metadata["name"],
    alt extends Metadata["alt"] = Metadata["alt"]
> extends TargetNode {
    parsedMeta: {
        file: file,
        name: name,
        alt: alt
    }
}

interface M<
    label extends string = string,
    referenceType extends mdast.referenceType = mdast.referenceType,
    alt extends string | undefined = string | undefined
> extends mdast.ImageReference{
    label: label,
    referenceType: referenceType,
    alt: alt
}

interface D<
    label extends string = string,
    url extends string = string,
    title extends string | undefined = string
> extends mdast.Definition {
    label: label,
    url: url,
    title: title
}

async function transformMermaidBlock<
    mermaidNode extends TargetNode
>(nd: mermaidNode, others: TransformerOptions) {
    const meta = nd.meta.split(" ").map(v => v.split("=") as [string,string]);
    const parsedMeta = meta.reduce(
        (c, [k,v]) => ({[k]: v, ...c})
    ,{} as Partial<Metadata> );

    if (!contains(parsedMeta, 'file', 'name')) return false;

    const { file: imageFilePath, name, alt } = parsedMeta;
    const parsedMermaidBlock = {
        parsedMeta: {
            file: imageFilePath,
            name,
            alt,
        },
        ...nd
    };

    await createRender(parsedMermaidBlock, others);

    return transformParsedMermaidBlock(imageFilePath, parsedMermaidBlock, others)
}


/** renders the mermaid block to a file, and
 * @returns the filepath
 */
async function createRender(mermaid: ParsedMermaidBlock, opts: TransformerOptions): Promise<string> {
    const { file: { cwd } } = opts
    const { parsedMeta: { file: fileTarget }, value: mermaidCode } = mermaid;
    const filepath = path.resolve(cwd, fileTarget);
    await promisify(writeFile)(
        filepath,
        await renderMermaid(mermaidCode, opts)
    )

    return filepath;
}

/** let me have my fun */
async function transformParsedMermaidBlock<
    file extends string,
    name extends string,
    alt extends string | undefined,
    mermaidNode extends ParsedMermaidBlock<string, name, alt>
    >(
    svgFile: file,
    mermaidNode: mermaidNode, opts: TransformerOptions): Promise<[
        /** image embed */
        M<name, "shortcut", alt | name>,
        /** image definition */
        D<name,file, alt>
    ]> {

        const { name, alt } = mermaidNode.parsedMeta;
        const identifier = name.toLowerCase();

        return [
            {
                type: "imageReference",
                identifier,
                label: name,
                referenceType: "shortcut",
                alt: alt ?? name
            },
            {
                type: "definition",
                label: name,
                url: svgFile,
                title: alt,
                identifier
            }
        ];
}

/**
 * _transformer takes an ast node and performs one of 
 * two operations:
 * 1) if `ast` is a `TargetNode`, the SVG may be rendered
 * and an [mdast.ImageReference, mdast.Definition] is returned
 * 2) otherwise, [ast] is retuerned.
 * @param ast ast node
 * @param opts config options
 */
export async function _transformer
    <T extends mdast.Node | TargetNode>
    (ast: T, opts: TransformerOptions) {

    const a: mdast.Node | TargetNode = ast;

    if ("children" in a) {
        const mappings = await Promise.all((<mdast.Content[]> a.children).map(
            async child => await _transformer(child, opts)
        ));

        // we either have [T] for no insertions or [T, T]
        // for an insertion, so we flatten.
        a.children = (
            mappings.flat as <A,B>(this: (A[] | B)[], depth?: 1) => (A|B)[]
            
            )();
    }

    if (!has(a, <{type: "code", lang: "mermaid"}> {
        type: "code",
        lang: "mermaid"
    })) return ast;

    const ret = await transformMermaidBlock(a, {
        ...opts,
    });

    if (!ret) return ast;
    return ret;
}

export default mermaidRender;