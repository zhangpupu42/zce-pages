#!/usr/bin/env node

process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
process.argv.push(require.resolve('..')) // require 是载入这个模块，resolve 是找到这个模块的相对路径 传递的参数都是相同的，都是相对路径，这里可以传 ../lib/index.js 但是对于这个模块，package.json 的 main 字段指定的入口文件就是 lib/index.js 所以这里直接传递 .. 就行了

require('gulp/bin/gulp')
