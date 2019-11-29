const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const visit = require('unist-util-visit');
const utils = require('./utils');

const PLUGIN_NAME = 'remark-mermaid';

/**
 * Given a node which contains a `url` property (eg. Link or Image), follow
 * the link, generate a graph and then replace the link with the link to the
 * generated graph. Ensures node has a title of `mermaid:` beforehand.
 *
 * @param   {object}  node
 * @param   {vFile}   vFile
 * @param {puppeteer.Browser} browser
 * @param {string} rendererDir see utils/rendererDir()
 * @return {object}
 */
async function replaceUrlWithGraph({ node, vFile, browser, rendererDir }) {
  const { title, url, position } = node;
  const { destinationDir } = vFile.data;

  if (title !== "mermaid:") return node;

  try {
    // eslint-disable-next-line no-param-reassign
    node.url = utils.renderFromFile({
      file:`${vFile.dirname}/${url}`,
      destinationDir,
      browser,
      rendererDir
    });

    vFile.info('mermaid link replaced with link to graph', position, PLUGIN_NAME);
  } catch (error) {
    vFile.message(error, position, PLUGIN_NAME);
  }

  return node;
}

/**
 * Given a link to a mermaid diagram, grab the contents from the link and put it
 * into a div that Mermaid JS can act upon.
 *
 * @param  {object}   node
 * @param  {integer}  index
 * @param  {object}   parent
 * @param  {vFile}    vFile
 * @return {object}
 */
function replaceLinkWithEmbedded(node, index, parent, vFile) {
  const { title, url, position } = node;
  let newNode;

  if (title !== "mermaid:") return node;

  try {
    const value = fs.readFileSync(`${vFile.dirname}/${url}`, { encoding: 'utf-8' });

    newNode = utils.createMermaidDiv(value);
    parent.children.splice(index, 1, newNode);
    vFile.info('mermaid link replaced with div', position, PLUGIN_NAME);
  } catch (error) {
    vFile.message(error, position, PLUGIN_NAME);
    return node;
  }

  return node;
}

/**
 * Given the MDAST ast, look for all fenced codeblocks that have a language of
 * `mermaid` and pass that to mermaid.cli to render the image. Replaces the
 * codeblocks with an image of the rendered graph.
 *
 * @param {object}  ast
 * @param {vFile}   vFile
 * @param {boolean} isSimple
 * @param {puppeteer.Browser} browser
 * @param {string} rendererDir see utils/rendererDir()
 * @return {function}
 */
async function visitCodeBlock({ ast, browser, rendererDir, vFile, isSimple }) {
  return visit(ast, 'code', (node, index, parent) => {
    const { lang, value, position } = node;
    const destinationDir = utils.getDestinationDir(vFile);
    let newNode;

    // If this codeblock is not mermaid, bail.
    if (lang !== 'mermaid') return node;
    
    // Are we just transforming to a <div>, or replacing with an image?
    if (isSimple) {
      newNode = createMermaidDiv(value);

      vFile.info(`${lang} code block replaced with div`, position, PLUGIN_NAME);

    // Otherwise, let's try and generate a graph!
    } else {
      let graphSvgFilename;
      try {
        graphSvgFilename = await utils.renderToFile({
          rendererDir,
          browser,
          source: value,
          destinationDir
        });

        vFile.info(`${lang} code block replaced with graph`, position, PLUGIN_NAME);
      } catch (error) {
        vFile.message(error, position, PLUGIN_NAME);
        return node;
      }

      newNode = {
        type: 'image',
        title: '`mermaid` image',
        url: graphSvgFilename,
      };
    }

    parent.children.splice(index, 1, newNode);

    return node;
  });
}

/**
 * If links have a title attribute called `mermaid:`, follow the link and
 * depending on `isSimple`, either generate and link to the graph, or simply
 * wrap the graph contents in a div.
 *
 * @param {object}  ast
 * @param {vFile}   vFile
 * @param {boolean} isSimple
 */
async function visitAll({ nodeType, ast, vFile, isSimple, browser, rendererDir }) {
  if (isSimple) {
    return visit(ast, nodeType, async (node, index, parent) => replaceLinkWithEmbedded(node, index, parent, vFile));
  }

  const replaceUrlWithGraphs = collectPromises(replaceUrlWithGraph);

  visit(
    ast,
    nodeType,
    node => replaceUrlWithGraphs({
      node, vFile, browser, rendererDir
    })
  );

  await Promise.all(replaceUrlWithGraphs.promises);
}

/**
 * collectPromises adapts synchronous code that calls
 * our functions e.g. visit() by returning a new function
 * which executes the same, but synchronously collects
 * the `Promise`s into an array that we can `await` on in
 * our asynchronous caller function.
 * @param {(...params: Array<any>) => Promise<any>} fn
 * @returns {Array<Promise<any>>}
 */
function collectPromises(fn) {
  const promises = [];

  return Object.assign((...args) => {
    promises.push(fn(...args));
  }, { promises });
}



/**
 * Returns the transformer which acts on the MDAST tree and given VFile.
 *
 * If `options.simple` is passed as a truthy value, the plugin will convert
 * to `<div class="mermaid">` rather than a SVG image.
 *
 * @link https://github.com/unifiedjs/unified#function-transformernode-file-next
 * @link https://github.com/syntax-tree/mdast
 * @link https://github.com/vfile/vfile
 *
 * @param {object} options
 * @return {function}
 */
async function mermaid(options = {}) {
  const isSimple = options.simple || false;
  const browser = options.browser || await puppeteer.launch();
  const rendererDir = await util.rendererDir();


  /**
   * @param {object} ast MDAST
   * @param {vFile} vFile
   * @param {function} next
   * @return {object}
   */
  return async function transformer(ast, vFile, next) {
    await Promise.all([
      visitCodeBlock({ rendererDir, browser, ast, vFile, isSimple}),
      visitAll({ nodeType: 'image', rendererDir, browser, ast, vFile, isSimple }),
      visitAll({ nodeType: 'link', rendererDir, browser, ast, vFile, isSimple }),
    ]);

    if (typeof next === 'function') {
      return next(null, ast, vFile);
    }

    return ast;
  };
}

module.exports = mermaid;
