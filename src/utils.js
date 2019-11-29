const crypto = require('crypto');
const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const tmp = require('tmp-promise');

const PLUGIN_NAME = 'remark-mermaid';

/**
 * Generates a temporary directory with the dependencies required by
 * mermaid.
 * 
 * A temporary directory is created, and files are soft linked
 * into this directory
 * @param {Record<string,string>} fileAssociations a mapping of source filepath to relative destination filepath
 * @returns {string} a prepared directory path
 */
async function makeRendererPath(fileAssociations) {
  // unsafeCleanup here just removes the temporary dir even if
  // there are files (links in this case) in it on process exit.
  const dir = await tmp.dir({ unsafeCleanup: true });

  await Promise.all(Object.entries(fileAssociations)
    .map(async ([from, to]) => 
      await promisify(fs.link)(from, path.join(dir.path, to))
  ));

  return dir.path;
}

/**
 * Generates a prepared renderer directory for mermaid.
 * This is necessary because mermaid needs to run in a browser,
 * acquiring source files that are in our dependencies.
 * @returns {string} a prepared directory path
 */
async function rendererDir() {
  // nb ... could probably do this dynamically by also
  // generating the html file but i am trying not to
  // go too deep here
  return await makeRendererPath({
    [require.resolve("mermaid")]: "mermaid",
    [require.resolve("@fortawesome/fontawesome-free-webfonts")]: "fontawesome",
    [path.join(__dirname, "puppet_render.html")]: "puppet_render.html",
  })
}

/**
 * Accepts the `source` of a mermaid graph as a string, and renders an SVG using
 * mermaid. Returns the rendered SVG content.
 *
 * @param  {string} source
 * @param {puppeteer.Browser} browser
 * @param  {string} rendererDir a prepared renderer directory (see rendererDir())
 * @return {string}
 */
async function render({ rendererDir, source, browser }) {
  const p = await browser.newPage();
  await p.goto(`file://${filepath.join(rendererDir, "puppet_render.html")}`);
  await p.waitForFunction(`window.mermaid.mermaidAPI.initialize`);

  const svg = await p.page.evaluate(source => {
    const mermaid = window.mermaid;
    mermaid.mermaidAPI.initialize({});
    return new Promise((ok, fail) => {
      mermaidAPI.render('render', source, svgCode => ok(svgCode));
    })
  }, source);

  p.close();

  return svg;
}

/**
 * Accepts the `source` of a mermaid graph as a string, and renders an SVG to a file.
 * Returns the file path.
 * @param {string} source 
 * @param {puppeteer.Browser} browser
 * @param  {string} rendererDir a prepared renderer directory (see rendererDir())
 * @param {string} destinationDir directory for the created svg
 */
async function renderToFile({ rendererDir, source, browser, destination }) {
  const unique = crypto.createHmac('sha1', PLUGIN_NAME).update(source).digest('hex');
  const svgFilename = `${unique}.svg`;
  const svgPath = path.join(destination, svgFilename);

  return await promisify(fs.writeFile)(svgPath, await render({ rendererDir, source, browser}))
}

/**
 * Takes a mermaid source file as an `inputFile` and returns the filepath
 * of a rendered SVG file.
 * @param  {string} file
 * @param  {string} destination
 * @param  {string} rendererDir a prepared renderer directory (see rendererDir())
 * @param  {puppeteer.Browser} browser
 * @return {string}
 */
async function renderFromFile({ file, destination, browser, rendererDir }) {
  const source = (await promisify(fs.readFile)(file)).toString()

  return renderToFile({
    browser,
    source,
    destination,
    rendererDir
  });
}

/**
 * Returns the destination for the SVG to be rendered at, explicity defined
 * using `vFile.data.destinationDir`, or falling back to the file's current
 * directory.
 *
 * @param {vFile} vFile
 * @return {string}
 */
function getDestinationDir(vFile) {
  if (vFile.data.destinationDir) {
    return vFile.data.destinationDir;
  }

  return vFile.dirname;
}

/**
 * Given the contents, returns a MDAST representation of a HTML node.
 *
 * @param  {string} contents
 * @return {object}
 */
function createMermaidDiv(contents) {
  return {
    type: 'html',
    value: `<div class="mermaid">
  ${contents}
</div>`,
  };
}

module.exports = {
  createMermaidDiv,
  getDestinationDir,
  render,
  renderFromFile,
  renderToFile,
  rendererDir
};
