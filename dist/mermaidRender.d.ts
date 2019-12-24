import puppeteer from 'puppeteer';
import { Config as renderMermaidConfig } from 'mermaid-render';
import { VFile } from 'vfile';
import * as mdast from './mdast';
import unified from 'unified';
export interface RemarkMermaidOptions extends renderMermaidConfig {
}
declare type Options = RemarkMermaidOptions;
declare type Eventually<T> = T | Promise<T>;
export declare const has: <T1 extends Record<string, any>, T2 extends Record<string, any>>(v1: T1, v2: T2) => v1 is T1 & T2;
interface mermaid extends unified.Plugin<[Partial<Options>?]> {
}
export declare const mermaidRender: mermaid;
export declare const mermaidGuardless: (options?: RemarkMermaidOptions) => (ast: mdast.Root, file: VFile) => Promise<mdast.Root>;
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
interface M<label extends string = string, referenceType extends mdast.referenceType = mdast.referenceType, alt extends string | undefined = string | undefined> extends mdast.ImageReference {
    label: label;
    referenceType: referenceType;
    alt: alt;
}
interface D<label extends string = string, url extends string = string, title extends string | undefined = string> extends mdast.Definition {
    label: label;
    url: url;
    title: title;
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
export declare function _transformer<T extends mdast.Node | TargetNode>(ast: T, opts: TransformerOptions): Promise<[M<string, "shortcut", string | undefined>, D<string, string, string | undefined>] | T>;
export default mermaidRender;
//# sourceMappingURL=mermaidRender.d.ts.map