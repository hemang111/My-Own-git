const CatFileCommand = require("./cat-file");
const HashwriteCommand = require("./hash-write");
const create_tree_git = require("./create-tree");
const write_tree_git = require("./write-tree");
const commit_tree = require("./commit-tree");
module.exports = {CatFileCommand,HashwriteCommand,create_tree_git,write_tree_git,commit_tree};