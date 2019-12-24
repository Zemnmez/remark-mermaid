"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const mermaid_render_1 = require("mermaid-render");
const fs_1 = require("fs");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
var unist;
(function (unist) {
    ;
})(unist || (unist = {}));
exports.has = (v1, v2) => Object.keys(v2).every(k => v1[k] === v2[k]);
const contains = (v1, ...v2) => v2.every(k => k in v1);
/*
const assertNever =
    (v: never, message: string) =>
        new Error(message)

export const mustMdastNode =
    (nd: unist.Node): mdast.Node => {
        const r = nd as mdast.Node;
        switch (r.type) {
        case "blockquote": case "break": case "code": case "definition": case "delete":
        case "emphasis": case "footnote": case "footnoteDefinition":
        case "footnoteReference": case "heading":
        case "html": case "image": case "link": case "linkReference": case "root":
        case "paragraph": case "thematicBreak":
        case "list": case "listItem": case "table": case "tableRow":
        case "tableCell": case "yaml": case "text": case "strong": case "inlineCode":
        case "imageReference":
        return r;
        default:
            throw assertNever(r, `${(r as any).type} seems not to be an mdast node (plugin order incorrect?)`)
        }
    }
*/
const mustRoot = (nd) => {
    if (nd.type !== "root")
        throw new Error(`${nd.type} is not root`);
    return nd;
};
;
exports.mermaidRender = (options) => {
    const transformer = exports.mermaidGuardless(options);
    console.log("fuck!");
    return async (node, file) => transformer(mustRoot(node), file);
};
exports.mermaidGuardless = (options = {}) => {
    var _a;
    const browser = (_a = options.browser, (_a !== null && _a !== void 0 ? _a : puppeteer_1.default.launch({
        // allow wsl
        args: ["--no-sandbox"]
    })));
    const ret = async (ast, file) => {
        const resp = await _transformer(ast, { ...options, file, browser });
        if (resp instanceof Array)
            throw new Error("this should never happen");
        return resp;
    };
    return ret;
};
async function transformMermaidBlock(nd, others) {
    const meta = nd.meta.split(" ").map(v => v.split("="));
    const parsedMeta = meta.reduce((c, [k, v]) => ({ [k]: v, ...c }), {});
    if (!contains(parsedMeta, 'file', 'name'))
        return false;
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
    return transformParsedMermaidBlock(file, parsedMermaidBlock, others);
}
/** renders the mermaid block to a file, and
 * @returns the filepath
 */
async function createRender(mermaid, opts) {
    const { file: { cwd } } = opts;
    const { parsedMeta: { file: fileTarget }, value: mermaidCode } = mermaid;
    const filepath = path_1.default.resolve(cwd, fileTarget);
    await util_1.promisify(fs_1.writeFile)(filepath, await mermaid_render_1.renderMermaid(mermaidCode, opts));
    return filepath;
}
/** let me have my fun */
async function transformParsedMermaidBlock(svgFile, mermaidNode, { ...others }) {
    const { name, alt } = mermaidNode.parsedMeta;
    const identifier = name.toLowerCase();
    return [
        {
            type: "imageReference",
            identifier,
            label: name,
            referenceType: "full" /* full */,
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
async function _transformer(ast, opts) {
    const a = ast;
    if ("children" in a) {
        const mappings = await Promise.all(a.children.map(async (child) => await _transformer(child, opts)));
        // we either have [T] for no insertions or [T, T]
        // for an insertion, so we flatten.
        a.children = mappings.flat();
    }
    console.log(JSON.stringify(a));
    if (!exports.has(a, {
        type: "code",
        lang: "mermaid"
    }))
        return ast;
    console.log(`got code`, a);
    const ret = await transformMermaidBlock(a, {
        ...opts,
    });
    if (!ret)
        return ast;
    return ret;
}
exports._transformer = _transformer;
exports.default = exports.mermaidRender;
//# sourceMappingURL=mermaidRender.js.map