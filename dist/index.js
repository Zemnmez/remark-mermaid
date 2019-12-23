"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer = __importStar(require("puppeteer"));
const mermaid_render_1 = require("mermaid-render");
const fs_1 = require("fs");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
var unist;
(function (unist) {
    ;
})(unist || (unist = {}));
const has = (v1, v2) => Object.keys(v1).every(k => {
    v1[k] === v2[k];
});
const contains = (v1, ...v2) => v2.every(k => k in v1);
exports.mermaid = (options = {}) => {
    var _a;
    const browser = (_a = options.browser, (_a !== null && _a !== void 0 ? _a : puppeteer.launch({
        // allow wsl
        args: ["--no-sandbox"]
    })));
    return async (ast, file) => {
        const resp = await _transformer(ast, { ...options, file, browser });
        /**
         * this check exists because the documentation for
         * `transformer` specifies that it needs to take a Node,
         * rather than a Root node. I doubt it actually happens, but
         * rather than make my types not reflective of the spec
         * I perform this check.
         */
        if (resp instanceof Array)
            return new Error("root node is not Root");
        return resp;
    };
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
    const { file: { dirname } } = opts;
    const { parsedMeta: { file: fileTarget }, value: mermaidCode } = mermaid;
    const filepath = path_1.default.resolve(dirname, fileTarget);
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
    const dirname = opts.file.dirname;
    if (!dirname)
        throw new Error(`cannot resolve location of vFile ${opts.file.path}`);
    if ("children" in a) {
        const mappings = await Promise.all(a.children.map(async (child) => await _transformer(child, opts)));
        // we either have [T] for no insertions or [T, T]
        // for an insertion, so we flatten.
        a.children = mappings.flat();
    }
    if (!has(a, {
        type: "code",
        lang: "mermaid"
    }))
        return ast;
    const ret = await transformMermaidBlock(a, {
        ...opts,
        file: {
            ...opts.file,
            dirname
        }
    });
    if (!ret)
        return ast;
    return ret;
}
exports._transformer = _transformer;
exports.default = exports.mermaid;
