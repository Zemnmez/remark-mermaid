import * as puppeteer from 'puppeteer';
import { Config as renderMermaidConfig, renderMermaid }
    from 'mermaid-render';
import { writeFile } from 'fs';
import { promisify } from 'util';
import path from 'path';


export interface Options extends renderMermaidConfig {}

type Eventually<T> = T | Promise<T>

/**
 * an ast representation of Markdown.
 * @see https://github.com/syntax-tree/mdast
 */
namespace mdast {
    /** an Attacher attaches a Transformer to the processor. */
    export interface Attacher<options extends any = unknown, nodeType extends Node = Node>
        extends unist.Attacher<options, nodeType> {

        (options?: options): Transformer<nodeType>
    }

    /** a Transformer transforms an mdast ast. */
    export interface Transformer<nodeType extends Node = Node>
        extends unist.Transformer<nodeType> {
    }

    /**
     * MIXINS
     */

    /** a mixin. an internal relation from one node to another */
    export interface Association<to extends unist.Node> {
        /** the normalized identifier */
        identifier: string,
        /** the raw identifier as in the source code */
        label?: string,
        /** FAKE FIELD. the intended type of the association */
        __type?: to
    }
    /** a mixin. a reference to a resouce */
    export interface Resource {
        /** url of the referenced resource */
        url: string,
        /** title of the referenced resource */
        title?: string
    }

    /** a Node containing other Nodes
     * mdast dosnt call this a mixin but since
     * it doesnt have a constant type i think they're wrong
    */
    export interface Parent extends unist.Parent, unist.Node {
        children: Array<Content>
    }
    /** a mixin. resource with an alt tag (used when resource
     * does not load, or for screen readers) */
    export interface Alternative {
        alt?: string
    } 

    /**
     * Interfaces
     */
    /** a Node containing a value. never a child. */
    export interface Literal<T = unknown> extends unist.Literal<T>, unist.Node {}

    /**
     * NODES
     */

    export type Node = 
        Root | Paragraph | Heading | ThematicBreak |
        Blockquote | List | ListItem | Table | TableRow |
        TableCell | HTML | Code | YAML | FootnoteDefinition |
        Text | Emphasis | Strong | Delete | InlineCode | Break |
        Link | Image | LinkReference | ImageReference |
        Footnote | FootnoteReference | Definition;
    
    /** a marker associated to another node */
    export interface Reference<T extends unist.Node> extends Association<T> {
        referenceType: referenceType
    }

    /** a document. never a child. */
    export interface Root extends Parent, unist.Node { type: "root" }
    /** a unit of discourse (??) (it's just text...) */
    export interface Paragraph extends Parent, unist.Node {
        type: "paragraph",
        children: Array<PhrasingContent>
    }
    /** heading of a section
     * @example markdown`
     * # My Document
     * `
     * @example markdown`
     * My Document
     * -----------
     * `
     */
    export interface Heading extends Parent, unist.Node {
        type: "heading",
        depth: number, // between 1 and 6
        children: Array<PhrasingContent>
    }
    /** @example markdown`***` */
    export interface ThematicBreak extends unist.Node {
        type: "thematicBreak"
    }
    /** a quoted section
     * @example markdown`
     * > Call me Ishmael
     * `
    */
    export interface Blockquote extends Parent, unist.Node {
        type: "blockquote",
        children: Array<BlockContent>
    }
    /** a list of items
     * @example markdown`
     * * eggs
     * * ham
     * * beans
     * `
    */
    export interface List extends Parent, unist.Node {
        type: "list",
        ordered?: boolean,
        start?: number,
        spread?: boolean,
        children: Array<ListContent>
    }
    /** an item in a List
     * @example markdown` * eggs `
    */
    export interface ListItem extends Parent, unist.Node {
        type: "listItem",
        checked?: boolean,
        spread?: boolean,
        children: Array<BlockContent>
    }
    /** a table 🏓 */
    export interface Table extends Parent, unist.Node {
        type: "table",
        align?: Array<AlignType>,
        children: Array<TableContent>
    }
    /** a row in a Table 🚣‍♀️ */
    export interface TableRow extends Parent, unist.Node {
        type: "tableRow",
        children: Array<RowContent>
    }
    /** header cell in a Table */
    export interface TableCell extends Parent, unist.Node {
        type: "tableCell",
        children: Array<PhrasingContent>
    }
    /** a fragment of raw HTML
     * @example markdown`<br/>`
    */
    export interface HTML extends Literal<string>, unist.Node {
        type: "html",
    }
    /** A block of preformatted text
     * @example markdown`
     * ···do()
     * `
     * @example markdown`
     * ${"```javascript"}
     * alert(1)
     * ${""```"}
     * `
     * 
    */
    export interface Code extends Literal<string>, unist.Node {
        type: "code",
        /** (computer) language of the code */
        lang?: string,
        /** custom information relating to the code */
        meta?: string
        /** the code in the code block */
    }
    /** a collection of metadata in yaml format
     * @example
     * ---
     * foo: bar
     * ---
    */
    export interface YAML extends Literal<string>, unist.Node {
        type: "yaml"
    }
    /** depresents a resource reference
     * @example markdown`[Alpha]: https://example.com`
    */
    export interface Definition
        extends
            Association<LinkReference|ImageReference>,
            Resource,
            unist.Node
        {
        type: "definition"
    }

    /** content relating to document outside of the flow
     * @example markdown`[^alpha]: bravo and charlie.`
     */
    export interface FootnoteDefinition
        extends
            Parent,
            unist.Node,
            Association<FootnoteReference>
        {

        type: "footnoteDefinition",
        children: Array<BlockContent>

    }
    /** just text */
    export interface Text extends Literal, unist.Node {
        type: "text"
    }
    /** visually stressed content
     * @example markdown`*alpha*`
     * @example markdown`_bravo_`
    */
    export interface Emphasis extends Parent, unist.Node {
        type: "emphasis",
        children: Array<PhrasingContent>
    }
    /** strong importance, seriousness or urgency
     * @example markdown`**alpha**`
     * @example markdown`__bravo__`
     */
    export interface Strong extends Parent, unist.Node {
        type: "strong",
        children: Array<PhrasingContent>
    }
    /** struck out content. content that is no longer
     * accurate or relevant
     * @example markdown`~~alpha~~
     */
    export interface Delete extends Parent, unist.Node {
        type: "delete",
        children: Array<PhrasingContent>
    }
    /** a fragment of computer code
     * @example markdown`${"`ok()`"}`
    */
    export interface InlineCode extends Literal<string>, unist.Node {
        type: "inlineCode"
    }
    /** a line break, as in poems or addresses
     * @example markdown`
     * foo··
     * bar`
    */
    export interface Break extends unist.Node {
        type: "break"
    }
    /** a hyperlink
     * @example markdown`[Alpha](https://example.com bravo)`
     */
    export interface Link extends Parent, unist.Node, Resource {
        type: "link",
        children: Array<StaticPhrasingContent>
    }
    /** an image!
     * @example markdown`
     * ![alpha](https://example.com/favicon.ico "bravo")`
    */
   export interface Image extends
    unist.Node, Resource, Alternative {
       type: "image"
   }
   /** a hyperlink by association
    * @example markdown`[Alpha][Alpha]`
    */
   export interface LinkReference extends
        Parent, Reference<Definition> {
        
        type: "linkReference",
        children: Array<StaticPhrasingContent>
    }
    /** an image by association
     * @example markdown`![alpha][myReference]`
     */
    export interface ImageReference extends
        unist.Node, Reference<Definition>, Alternative {

        type: "imageReference"
    }
    /**
     * content relating to the document that is outside
     * its flow
     * @example markdown`[^alpha bravo]`
     */
    export interface Footnote extends Parent {
        type: "footnote",
        children: Array<PhrasingContent>
    }
    /** a marker through association
     * @example markdown`[^alpha]`
    */
    export interface FootnoteReference extends
        unist.Node, Association<FootnoteDefinition> {
        type: "footnoteReference"
    }

    /**
     * ENUMS
     */

    export const enum specifiedAlignTypes {
        /** @see https://drafts.csswg.org/css-text/#valdef-text-align-left */
        left = "left",
        /** @see https://drafts.csswg.org/css-text/#valdef-text-align-right */
        right = "right",
        /** @see https://drafts.csswg.org/css-text/#valdef-text-align-center */
        center = "center"
    }
    
    /**
     * how content is aligned --
     * null indicates the host environment determines it.
     */
    export type AlignType = specifiedAlignTypes | null

    /** the explicitness of a `Reference` */
    export const enum referenceType {
        /** reference is implicit; identifier inferred from content */
        shortcut = "shortcut",
        /** reference explicit; identifier inferred from content */
        collapsed = "collapsed",
        /** reference is explicit. identifier explicitly set */
        full = "full"
    }

    /**
     * CONTENT
     */

    export type Content =
        TopLevelContent | ListContent | TableContent | RowContent | PhrasingContent

    /** sections of a document and metadata */
    export type TopLevelContent =
        BlockContent | FrontmatterContent | DefinitionContent
    
    /** sections of a document */
    export type BlockContent =
        Paragraph | Heading | ThematicBreak | Blockquote | List | Table | HTML | Code

    /** out of band info */
    export type FrontmatterContent =
        YAML

    /** out of band information; typically affecting `Association` */
    export type DefinitionContent = Definition | FootnoteDefinition

    /** items in a list */
    export type ListContent = ListItem

    /** rows in a table */
    export type RowContent = TableCell

    /** stuff in a table */
    export type TableContent = TableRow

    /** text in a document and its markup */
    export type PhrasingContent = StaticPhrasingContent | Link | LinkReference

    /** the text in a document and its markup not intended for user
     * interaction */
    export type StaticPhrasingContent = 
        Text | Emphasis | Strong | Delete |
        HTML | InlineCode | Break | Image |
        ImageReference | Footnote | FootnoteReference;

}

namespace unist {
    /** node that contains a value */
    export interface Literal<T = unknown> extends Node {
        value: T
    }

    /** Nodes containing other Nodes */
    export interface Parent extends Node {
        Children: Node[]
    }

    /** a point in a remark ast */
    export interface Point {
        line?: number,
        column?: number,
        offset: number
    }

    /** literally fucking anything */
    export interface Data {};

    /** a position in a remark ast */
    export interface Position {
        start: Point,
        end: Point,
        indent: number
    }

    /** a remark ast node */
    export interface Node {
        /** what type the node implements */
        type: string,
        /** arbitrary data */
        data?: Data,
        /** location of the node */
        position?: Position
    }

    /** a 'virtual file' */
    export interface vFile {
        /** path of vFile */
        path?: string

        /** Raw value */
        contents: Buffer | string | null,

        /** Base of `path` */
        cwd: string

        /**
         * current name including extension
         * cannot contain path separators
         */
        basename?: string,

        /** Name (without extension) */
        stem?: string,
        /** Extension with dot */
        extname?: string,
        /** Path to parent directory */
        dirname?: string,
        /** list of file-paths the file has been moved between */
        history?: string[],
        /** for storage of custom information */
        data?: any,

        /**
         * Convert the contents to string.
         * @param encoding target string encoding (if `contents`
         * is a buffer) -- defaults to "utf8"
         */
        toString(encoding: string): string

        /**
         * associates a 'message' with the file, where
         * fatal is set to false
         * @see https://github.com/vfile/vfile-message/tree/3596c73a06c5db6af031d0aab06a3fb29c7b1044#api
         */
        message: (
            /**
             * reason for the message
             */
            reason: ConstructorParameters<VMessage>[0],

            /**
             * place where it ocurred
             */
            position: ConstructorParameters<VMessage>[1],

            /**
             * place in code where message originates from
             */
            origin: ConstructorParameters<VMessage>[2]
        ) => VMessage
    }

    /**
     * @see https://github.com/vfile/vfile-message/tree/3596c73a06c5db6af031d0aab06a3fb29c7b1044#api
     */
    export type VMessage = {
        new(
            /**
             * reason for the message
             */
            reason: string | Error,

            /**
             * place where the message occurred
             */
            position: Position | Node | Point,

            /**
             * place in code the message originates from
            */
        origin?: string
        ): VMessage,

        /** reason for the message */
        reason: string,

        /** if true marks associated file as no longer processible */
        fatal?: boolean,

        /** starting line of error */
        line?: number,

        /** starting column of error */
        column?: number,

        /** full range information, when available */
        location?: Position,

        /** namespace of warning */
        source?: string,

        /** category of message */
        ruleId?: string,

        /** path of a file */
        file?: string,

        /** long form description of message */
        note?: string,

        /** link to documentation */
        url?: string
    }


    /**
     * a confirgurable plugin.
     */
    export interface Attacher<options extends any = unknown, nodeType extends Node = Node> {
        (options: options): Transformer<nodeType>
    }


    /**
     * A function for transforming the AST of a file.
     * @param node a syntax ast to handle
     * @param file a file to handle
     * @param next if next is a parameter, the transformer
     * may perform asynchronous operations -- but
     * *must* also call next() once done.
     * @returns {void | Eventually<Error | Node>}
     * if nothing is returned, no changes are made.
     * if an Error is returned, it is considered a fatal error.
     */
    export interface Transformer<nodeType extends Node = Node> {
        (node: nodeType, file: vFile): void | Eventually<Error | nodeType>
    }
}

const has =
    <T1 extends Record<string, any>, T2 extends Record<string,any>>(v1: T1, v2: T2): v1 is (T1 & T2) => 
        Object.keys(v1).every(k => {
            v1[k]===v2[k]
        })
 

const contains =
    <T1, T2 extends keyof T1>(v1: T1, ...v2: Array<T2>): v1 is T1 & {
        [k in T2]-?: Exclude<T1[k], undefined>
    } => v2.every(k => k in v1);

export const mermaid:
    mdast.Attacher<Options> =
(options: Options = {}) => {

    const browser = options.browser ??
        puppeteer.launch({
            // allow wsl
            args: ["--no-sandbox"]
        });


    return async (ast: mdast.Node, file: unist.vFile) => {
        const resp = await _transformer(ast, {...options, file, browser})

        /**
         * this check exists because the documentation for
         * `transformer` specifies that it needs to take a Node,
         * rather than a Root node. I doubt it actually happens, but
         * rather than make my types not reflective of the spec
         * I perform this check.
         */
        if (resp instanceof Array) return new Error(
            "root node is not Root"
        );

        return resp;
    }
}

interface TransformerOptions extends Options {
    browser: Eventually<puppeteer.Browser>
    file: unist.vFile
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
>(nd: mermaidNode, others: CreateRenderOptions) {
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

    const file = await createRender(parsedMermaidBlock, others);

    return transformParsedMermaidBlock(file, parsedMermaidBlock, others)
}

interface vFileWithDirname extends unist.vFile {
    dirname: string
}

interface CreateRenderOptions extends TransformerOptions {
    file: vFileWithDirname,
}

/** renders the mermaid block to a file, and
 * @returns the filepath
 */
async function createRender(mermaid: ParsedMermaidBlock, opts: CreateRenderOptions): Promise<string> {
    const { file: { dirname } } = opts
    const { parsedMeta: { file: fileTarget }, value: mermaidCode } = mermaid;
    const filepath = path.resolve(dirname, fileTarget);
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
    mermaidNode: mermaidNode, {...others}: TransformerOptions): Promise<[
        /** image embed */
        M<name, mdast.referenceType.full, alt>,
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
                referenceType: mdast.referenceType.full,
                alt: alt
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

    const dirname = opts.file.dirname;

    if (!dirname) throw new Error(
        `cannot resolve location of vFile ${opts.file.path}`
    );

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
        file: {
            ...opts.file,
            dirname
        }
    });
    if (!ret) return ast;
    return ret;
}

export default mermaid;