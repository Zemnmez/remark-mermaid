import * as puppeteer from 'puppeteer';
import { Config as renderMermaidConfig, renderMermaid }
    from 'mermaid-render';

export type Options =  & {
} & renderMermaidConfig

/** to prevent us from using the global Node by accident */
type Node = never;

type Eventually<T> = T | Promise<T>

/**
 * an ast representation of Markdown.
 * @see https://github.com/syntax-tree/mdast
 */
namespace mdast {
    export type nextFunc = (err?: Error, tree?: Node, file?: unist.vFile) => unknown;
    export type Attacher<T = unknown> = ((options: T) => Transformer);

    export type Transformer = 
        ((node: Node, file?: unist.vFile) =>
            void | Eventually<Error | Node>) 
  ;

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
    /** a mixin. resource with an alt tag (used when resource
     * does not load, or for screen readers) */
    export interface Alternative {
        alt?: string
    } 

    export type Reference<T extends unist.Node> = Association<T> & {
        referenceType: referenceType
    }

    /**
     * NODES
     */
    export type Node = Parent | Literal |
        Root | Paragraph | Heading | ThematicBreak |
        Blockquote | List | ListItem | Table | TableRow |
        TableCell | HTML | Code | YAML | FootnoteDefinition |
        Text | Emphasis | Strong | Delete | InlineCode | Break |
        Link | Image | LinkReference | ImageReference |
        Footnote | FootnoteReference | Definition;

    /** a marker associated to another node */

    /** a Node containing other Nodes */
    export type Parent = unist.Parent & unist.Node & {
        children: Array<Content>
    }

    /** a Node containing a value. never a child. */
    export type Literal = unist.Literal & unist.Node & {}
    /** a document. never a child. */
    export type Root = Parent & unist.Node & { type: "root" }
    /** a unit of discourse (??) (it's just text...) */
    export type Paragraph = Parent & unist.Node & {
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
    export type Heading = Parent & unist.Node & {
        type: "heading",
        depth: number, // between 1 and 6
        children: Array<PhrasingContent>
    }
    /** @example markdown`***` */
    export type ThematicBreak = unist.Node & {
        type: "thematicBreak"
    }
    /** a quoted section
     * @example markdown`
     * > Call me Ishmael
     * `
    */
    export type Blockquote = Parent & unist.Node & {
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
    export type List = Parent & unist.Node & {
        type: "list",
        ordered?: boolean,
        start?: number,
        spread?: boolean,
        children: Array<ListContent>
    }
    /** an item in a List
     * @example markdown` * eggs `
    */
    export type ListItem = Parent & unist.Node & {
        type: "listItem",
        checked?: boolean,
        spread?: boolean,
        children: Array<BlockContent>
    }
    /** a table 🏓 */
    export type Table = Parent & unist.Node  & {
        type: "table",
        align?: Array<AlignType>,
        children: Array<TableContent>
    }
    /** a row in a Table 🚣‍♀️ */
    export type TableRow = Parent & unist.Node  & {
        type: "tableRow",
        children: Array<RowContent>
    }
    /** header cell in a Table */
    export type TableCell = Parent & unist.Node  & {
        type: "tableCell",
        children: Array<PhrasingContent>
    }
    /** a fragment of raw HTML
     * @example markdown`<br/>`
    */
    export type HTML = Literal & unist.Node  & {
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
    type Code = Literal & unist.Node & {
        type: "code",
        /** (computer) language of the code */
        lang?: string,
        /** custom information relating to the code */
        meta?: string
    }
    /** a collection of metadata in yaml format
     * @example
     * ---
     * foo: bar
     * ---
    */
    export type YAML = Literal & unist.Node  & {
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
    export type Text = Literal & unist.Node  & {
        type: "text"
    }
    /** visually stressed content
     * @example markdown`*alpha*`
     * @example markdown`_bravo_`
    */
    export type Emphasis = Parent & unist.Node  & {
        type: "emphasis",
        children: Array<PhrasingContent>
    }
    /** strong importance, seriousness or urgency
     * @example markdown`**alpha**`
     * @example markdown`__bravo__`
     */
    export type Strong = Parent & unist.Node  & {
        type: "strong",
        children: Array<PhrasingContent>
    }
    /** struck out content. content that is no longer
     * accurate or relevant
     * @example markdown`~~alpha~~
     */
    export type Delete = Parent & unist.Node  & {
        type: "delete",
        children: Array<PhrasingContent>
    }
    /** a fragment of computer code
     * @example markdown`${"`ok()`"}`
    */
    export type InlineCode = Literal & unist.Node  & {
        type: "inlineCode"
    }
    /** a line break, as in poems or addresses
     * @example markdown`
     * foo··
     * bar`
    */
    export type Break = unist.Node  & {
        type: "break"
    }
    /** a hyperlink
     * @example markdown`[Alpha](https://example.com bravo)`
     */
    export type Link = Parent & unist.Node & Resource  & {
        type: "link",
        children: Array<StaticPhrasingContent>
    }
    /** an image!
     * @example markdown`
     * ![alpha](https://example.com/favicon.ico "bravo")`
    */
   export type Image =
    unist.Node & Resource & Alternative & {
       type: "image"
   }
   /** a hyperlink by association
    * @example markdown`[Alpha][Alpha]`
    */
   export type LinkReference =
        Parent & Reference<Definition> &  {
        
        type: "linkReference",
        children: Array<StaticPhrasingContent>
    }
    /** an image by association
     * @example markdown`![alpha][myReference]`
     */
    export type ImageReference =
        unist.Node & Reference<Definition> & Alternative & {

        type: "imageReference"
    }
    /**
     * content relating to the document that is outside
     * its flow
     * @example markdown`[^alpha bravo]`
     */
    export type Footnote = Parent  & {
        type: "footnote",
        children: Array<PhrasingContent>
    }
    /** a marker through association
     * @example markdown`[^alpha]`
    */
    export type FootnoteReference =
        unist.Node & Association<FootnoteDefinition> & {
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
    export type Literal<T = unknown> = Node  & {
        value: T
    }

    /** Nodes containing other Nodes */
    export type Parent = Node  & {
        Children: Node[]
    }

    /** a point in a remark ast */
    export interface Point {
        line?: number,
        column?: number,
        offset: number
    }

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
        data?: unknown,
        /** location of the node */
        position?: Position
    }

    /** a 'virtual file' */
    export interface vFile {
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
        data?: unknown,

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
    export type VMessage =  & {
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
     * a confirgurable remark plugin.
     */
    export type Attacher<T = unknown> = (options?: T) => Transformer;

    type TransformerReturnType = void | Eventually<Error | Node>


    export type nextFunc = (err?: Error, tree?: Node, file?: vFile) => unknown;

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
    export type Transformer =
        ((node: Node, file: vFile, next?: nextFunc) =>
            void | Error | Node) |
        ((node: Node, file?: vFile) =>
            void | Eventually<Error | Node>);
}
export const mermaid: mdast.Attacher<Options> =
    (options: Options = {}) => {
        if (!options.browser) options.browser =
            puppeteer.launch({
                // allow wsl
                args: ["--no-sandbox"]
            });

        const transform = async (ast: mdast.Node, file: unist.vFile) => {
            // walk
            if ("children" in ast)
                await Promise.all((<Array<mdast.Content>> ast.children).map(
                    child => transform(child, file)
                ));


            return new Error("unimplemented")
        }

        return transform;
    }
