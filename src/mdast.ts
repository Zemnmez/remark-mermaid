import unist from 'unist';

/**
 * an ast representation of Markdown.
 * @see https://github.com/syntax-tree/mdast
 */
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

/**
 * a Node containing other Nodes
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
export interface Literal<T = unknown> extends unist.Literal, unist.Node {
    value: T
}

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

    export type specifiedAlignTypes = "left" | "right" | "center"


//export const enum specifiedAlignTypes {
    /** @see https://drafts.csswg.org/css-text/#valdef-text-align-left */
    //left = "left",
    /** @see https://drafts.csswg.org/css-text/#valdef-text-align-right */
    //right = "right",
    /** @see https://drafts.csswg.org/css-text/#valdef-text-align-center */
    //center = "center"
//}

/**
 * how content is aligned --
 * null indicates the host environment determines it.
 */
export type AlignType = specifiedAlignTypes | null

/**
 * reference is implicit; identifier inferred from content
 * @example markdown`[MyWebsite]`
*/
type rtype_shortcut = "shortcut";
/**
 * reference explicit; identifier inferred from content
 * @example markdown`[][MyWebsite]`
 */
type rtype_collapsed = "collapsed";
/**
 * reference is explicit. identifier explicitly set
 * @example markdown`[MyWebsite][MyWebsite]`
 */
type rtype_full = "full";

export type referenceType = rtype_shortcut | rtype_collapsed | rtype_full;


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