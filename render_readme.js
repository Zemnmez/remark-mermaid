#!/usr/bin/env/node

const start = require('unified-args');
const markdown = require('remark');
const unified = require('unified');
const renderMermaid = require('./dist/index.js');
const recommended = require('remark-preset-lint-recommended');
const stringifyMarkdown = require('remark-stringify');
const pack = require('./package.json');
const { name, description, version } = pack;

start({
    processor: unified().use(markdown).use(recommended).use(renderMermaid).use(stringifyMarkdown),
    name: pack.name,
    description,
    pluginPrefix: "",
    version,
    extensions: [".md"],
    packageField: `${name}Config`,
    rcName: `.${name}rc`,
    ignoreName: `.${name}ignore`
})