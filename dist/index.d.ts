import puppeteer from 'puppeteer';
import { Config as renderMermaidConfig } from 'mermaid-render';
import Unist from 'unist';
import { VFile } from 'vfile';
import unified from 'unified';
export interface RemarkMermaidOptions extends renderMermaidConfig {
}
declare type Options = RemarkMermaidOptions;
declare type Eventually<T> = T | Promise<T>;
/**
 * an ast representation of Markdown.
 * @see https://github.com/syntax-tree/mdast
 */
declare namespace mdast {
    /** an Attacher attaches a Transformer to the processor. */
    interface Attacher<options extends any = unknown, inType extends Node = Node, outType extends Node = inType> extends unist.Attacher<options, inType, outType> {
        (options?: options): Transformer<inType, outType>;
    }
    /** a Transformer transforms an mdast ast. */
    interface Transformer<inType extends Node = Node, outType extends Node = inType> extends unist.Transformer<inType, outType> {
    }
    /**
     * MIXINS
     */
    /** a mixin. an internal relation from one node to another */
    interface Association<to extends unist.Node> {
        /** the normalized identifier */
        identifier: string;
        /** the raw identifier as in the source code */
        label?: string;
        /** FAKE FIELD. the intended type of the association */
        __type?: to;
    }
    /** a mixin. a reference to a resouce */
    interface Resource {
        /** url of the referenced resource */
        url: string;
        /** title of the referenced resource */
        title?: string;
    }
    /** a Node containing other Nodes
     * mdast dosnt call this a mixin but since
     * it doesnt have a constant type i think they're wrong
    */
    interface Parent extends unist.Parent, unist.Node {
        children: Array<Content>;
    }
    /** a mixin. resource with an alt tag (used when resource
     * does not load, or for screen readers) */
    interface Alternative {
        alt?: string;
    }
    /**
     * Interfaces
     */
    /** a Node containing a value. never a child. */
    interface Literal<T = unknown> extends unist.Literal<T>, unist.Node {
    }
    /**
     * NODES
     */
    type Node = Root | Paragraph | Heading | ThematicBreak | Blockquote | List | ListItem | Table | TableRow | TableCell | HTML | Code | YAML | FootnoteDefinition | Text | Emphasis | Strong | Delete | InlineCode | Break | Link | Image | LinkReference | ImageReference | Footnote | FootnoteReference | Definition;
    /** a marker associated to another node */
    interface Reference<T extends unist.Node> extends Association<T> {
        referenceType: referenceType;
    }
    /** a document. never a child. */
    interface Root extends Parent, unist.Node {
        type: "root";
    }
    /** a unit of discourse (??) (it's just text...) */
    interface Paragraph extends Parent, unist.Node {
        type: "paragraph";
        children: Array<PhrasingContent>;
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
    interface Heading extends Parent, unist.Node {
        type: "heading";
        depth: number;
        children: Array<PhrasingContent>;
    }
    /** @example markdown`***` */
    interface ThematicBreak extends unist.Node {
        type: "thematicBreak";
    }
    /** a quoted section
     * @example markdown`
     * > Call me Ishmael
     * `
    */
    interface Blockquote extends Parent, unist.Node {
        type: "blockquote";
        children: Array<BlockContent>;
    }
    /** a list of items
     * @example markdown`
     * * eggs
     * * ham
     * * beans
     * `
    */
    interface List extends Parent, unist.Node {
        type: "list";
        ordered?: boolean;
        start?: number;
        spread?: boolean;
        children: Array<ListContent>;
    }
    /** an item in a List
     * @example markdown` * eggs `
    */
    interface ListItem extends Parent, unist.Node {
        type: "listItem";
        checked?: boolean;
        spread?: boolean;
        children: Array<BlockContent>;
    }
    /** a table 🏓 */
    interface Table extends Parent, unist.Node {
        type: "table";
        align?: Array<AlignType>;
        children: Array<TableContent>;
    }
    /** a row in a Table 🚣‍♀️ */
    interface TableRow extends Parent, unist.Node {
        type: "tableRow";
        children: Array<RowContent>;
    }
    /** header cell in a Table */
    interface TableCell extends Parent, unist.Node {
        type: "tableCell";
        children: Array<PhrasingContent>;
    }
    /** a fragment of raw HTML
     * @example markdown`<br/>`
    */
    interface HTML extends Literal<string>, unist.Node {
        type: "html";
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
    interface Code extends Literal<string>, unist.Node {
        type: "code";
        /** (computer) language of the code */
        lang?: string;
        /** custom information relating to the code */
        meta?: string;
    }
    /** a collection of metadata in yaml format
     * @example
     * ---
     * foo: bar
     * ---
    */
    interface YAML extends Literal<string>, unist.Node {
        type: "yaml";
    }
    /** depresents a resource reference
     * @example markdown`[Alpha]: https://example.com`
    */
    interface Definition extends Association<LinkReference | ImageReference>, Resource, unist.Node {
        type: "definition";
    }
    /** content relating to document outside of the flow
     * @example markdown`[^alpha]: bravo and charlie.`
     */
    interface FootnoteDefinition extends Parent, unist.Node, Association<FootnoteReference> {
        type: "footnoteDefinition";
        children: Array<BlockContent>;
    }
    /** just text */
    interface Text extends Literal, unist.Node {
        type: "text";
    }
    /** visually stressed content
     * @example markdown`*alpha*`
     * @example markdown`_bravo_`
    */
    interface Emphasis extends Parent, unist.Node {
        type: "emphasis";
        children: Array<PhrasingContent>;
    }
    /** strong importance, seriousness or urgency
     * @example markdown`**alpha**`
     * @example markdown`__bravo__`
     */
    interface Strong extends Parent, unist.Node {
        type: "strong";
        children: Array<PhrasingContent>;
    }
    /** struck out content. content that is no longer
     * accurate or relevant
     * @example markdown`~~alpha~~
     */
    interface Delete extends Parent, unist.Node {
        type: "delete";
        children: Array<PhrasingContent>;
    }
    /** a fragment of computer code
     * @example markdown`${"`ok()`"}`
    */
    interface InlineCode extends Literal<string>, unist.Node {
        type: "inlineCode";
    }
    /** a line break, as in poems or addresses
     * @example markdown`
     * foo··
     * bar`
    */
    interface Break extends unist.Node {
        type: "break";
    }
    /** a hyperlink
     * @example markdown`[Alpha](https://example.com bravo)`
     */
    interface Link extends Parent, unist.Node, Resource {
        type: "link";
        children: Array<StaticPhrasingContent>;
    }
    /** an image!
     * @example markdown`
     * ![alpha](https://example.com/favicon.ico "bravo")`
    */
    interface Image extends unist.Node, Resource, Alternative {
        type: "image";
    }
    /** a hyperlink by association
     * @example markdown`[Alpha][Alpha]`
     */
    interface LinkReference extends Parent, Reference<Definition> {
        type: "linkReference";
        children: Array<StaticPhrasingContent>;
    }
    /** an image by association
     * @example markdown`![alpha][myReference]`
     */
    interface ImageReference extends unist.Node, Reference<Definition>, Alternative {
        type: "imageReference";
    }
    /**
     * content relating to the document that is outside
     * its flow
     * @example markdown`[^alpha bravo]`
     */
    interface Footnote extends Parent {
        type: "footnote";
        children: Array<PhrasingContent>;
    }
    /** a marker through association
     * @example markdown`[^alpha]`
    */
    interface FootnoteReference extends unist.Node, Association<FootnoteDefinition> {
        type: "footnoteReference";
    }
    /**
     * ENUMS
     */
    const enum specifiedAlignTypes {
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
    type AlignType = specifiedAlignTypes | null;
    /** the explicitness of a `Reference` */
    const enum referenceType {
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
    type Content = TopLevelContent | ListContent | TableContent | RowContent | PhrasingContent;
    /** sections of a document and metadata */
    type TopLevelContent = BlockContent | FrontmatterContent | DefinitionContent;
    /** sections of a document */
    type BlockContent = Paragraph | Heading | ThematicBreak | Blockquote | List | Table | HTML | Code;
    /** out of band info */
    type FrontmatterContent = YAML;
    /** out of band information; typically affecting `Association` */
    type DefinitionContent = Definition | FootnoteDefinition;
    /** items in a list */
    type ListContent = ListItem;
    /** rows in a table */
    type RowContent = TableCell;
    /** stuff in a table */
    type TableContent = TableRow;
    /** text in a document and its markup */
    type PhrasingContent = StaticPhrasingContent | Link | LinkReference;
    /** the text in a document and its markup not intended for user
     * interaction */
    type StaticPhrasingContent = Text | Emphasis | Strong | Delete | HTML | InlineCode | Break | Image | ImageReference | Footnote | FootnoteReference;
}
declare namespace unist {
    /** node that contains a value */
    interface Literal<T extends unknown = unknown> extends Unist.Literal {
        value: T;
    }
    type Parent = Unist.Parent;
    /** a point in a remark ast */
    interface Point {
        line?: number;
        column?: number;
        offset: number;
    }
    /** literally fucking anything */
    interface Data {
    }
    /** a position in a remark ast */
    interface Position {
        start: Point;
        end: Point;
        indent: number;
    }
    type Node = Unist.Node;
    /**
     * @see https://github.com/vfile/vfile-message/tree/3596c73a06c5db6af031d0aab06a3fb29c7b1044#api
     */
    type VMessage = {
        new (
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
        origin?: string): VMessage;
        /** reason for the message */
        reason: string;
        /** if true marks associated file as no longer processible */
        fatal?: boolean;
        /** starting line of error */
        line?: number;
        /** starting column of error */
        column?: number;
        /** full range information, when available */
        location?: Position;
        /** namespace of warning */
        source?: string;
        /** category of message */
        ruleId?: string;
        /** path of a file */
        file?: string;
        /** long form description of message */
        note?: string;
        /** link to documentation */
        url?: string;
    };
    interface Attacher<
    /** options and settings */
    options extends any = unknown, 
    /** the type of node the Transformer takes */
    inType extends Node = Node, 
    /** the type of node the transformer produces */
    outType extends Node = inType> {
        (options: options): Transformer<inType, outType>;
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
    interface Transformer<inType extends Node = Node, outType extends Node = inType> {
        (node: inType, file: VFile): void | Eventually<Error | outType>;
    }
}
interface mermaid extends unified.Plugin<[Partial<Options>?]> {
}
export declare const renderMermaidMarkdown: mermaid;
export declare const mermaidGuardless: (options?: RemarkMermaidOptions) => (ast: mdast.Root, file: VFile) => Promise<mdast.Node>;
interface TransformerOptions extends Options {
    browser: Eventually<puppeteer.Browser>;
    file: VFile;
}
export interface TargetNode extends mdast.Code {
    lang: "mermaid";
    meta: string;
}
export declare type Metadata = {
    /** the file to render to */
    file: string;
    /** the name of the defined identifier
     * e.g. name = "ok"
     * produces [ok]: ./my/file.svg
     */
    name: string;
    /** the optional title alt text
     * for the rendered image resource
     */
    alt?: string;
};
/**
 * _transformer takes an ast node and performs one of
 * two operations:
 * 1) if `ast` is a `TargetNode`, the SVG may be rendered
 * and an [mdast.ImageReference, mdast.Definition] is returned
 * 2) otherwise, [ast] is retuerned.
 * @param ast ast node
 * @param opts config options
 */
export declare function _transformer<T extends mdast.Node | TargetNode>(ast: T, opts: TransformerOptions): Promise<mdast.Node | mdast.Node[]>;
export default renderMermaidMarkdown;
//# sourceMappingURL=index.d.ts.map