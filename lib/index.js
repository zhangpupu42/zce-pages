const path = require('path')

const { src, dest, series, parallel, watch } = require('gulp') // 先导入 gulp 所提供的 API

const del = require('del')

const browserSync = require('browser-sync')

const loadPlugins = require('gulp-load-plugins') // 得到一个方法

const plugins = loadPlugins() // 得到一个对象，所有的插件都会成为这个对象下方的一个属性，命名方式就是把 gulp- 去掉，后边的变成小驼峰格式 比如： gulp-pa-bbb 使用的时候就是 plugins.paBbb

const bs = browserSync.create() // 自动创建一个开发服务器

const cwd = process.cwd() // 返回当前命令行所在工作目录

let config = require('./config.default') // 为甚么用 let ，因为读 pages.config.js 的时候不一定有这个文件，程序是肯定不能让报错的，可以有一些默认的配置出现

try { // 尝试读取
    let loadConfig = require(path.join(cwd, 'pages.config.js'))
    config = Object.assign({}, config, loadConfig)
} catch (err) { } // 错误实际上是不需要处理的，有默认的配置选项

const clean = () => {
    return del([config.build.dist, config.build.temp]) // 返回的是 promise ，也就意味着 clean 任务完成之后可以被标记为完成状态
}

// 首先先定义私有的任务，后续再通过 module.exports 选择性的导出
// 定义 style 任务
const style = () => {
    // 这里直接 config.build.paths.styles 的话会有问题，因为原来是在 src 下面的 assets ... 可以在 base 后面添加一个 cwd 意思是当前任务工作路径，也就是在 src 下面工作的，这时候找的就是 src 下面的 assets ...
    return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src }) // 创建文件读取流, 指定一个 base 基准路径，就可以把 src 下面的路径给保留下来
        .pipe(plugins.sass({ outputStyle: 'expanded' })) // 给 sass 指定选项 
        .pipe(dest(config.build.temp)) // 写入流
        .pipe(bs.reload({ stream: true }))
}

// 定义 script 任务
const script = () => {
    return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src }) // 同样给一个基准路径
        .pipe(plugins.babel({ presets: [require('@babel/preset-env')] })) // 添加以下 babel 的配置
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}

// 定义 page 任务
const page = () => {
    // 如果不只是在 src 下面有 html 文件的话，可以使用 src/**/*.html 意思是 src 下面任意子目录下的 *.html 文件，这是子目录的通配方式，这里的 base 设置的就没有意义了，因为通配符就在 src 目录下,为了保证统一，所以设置一下 base
    return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.swig({ data: config.data }))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}

// image 任务
const image = () => {
    return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src }) // ** images 下边的所有文件
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

// font 任务
const font = () => {
    return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src }) // ** images 下边的所有文件
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

// 额外的
const extra = () => {
    // 这里直接通配 public 下面所有的文件就好了
    return src('**', { base: config.build.public, cwd: config.build.public })
        .pipe(dest(config.build.dist))
}

const reload = () => {
    bs.reload()
}

const serve = () => { // 把服务器放到一个任务当中
    // watch 的 cwd 同样也可以通过第二个参数的方式传递进去
    watch(config.build.paths.styles, { cwd: config.build.src }, style) // 在 serve 任务开始的时候先监视一些文件(源代码文件)，两个参数，1-通配符，2-对应的执行任务
    watch(config.build.paths.scripts, { cwd: config.build.src }, script) // 在 serve 任务开始的时候先监视一些文件(源代码文件)，两个参数，1-通配符，2-对应的执行任务
    watch(config.build.paths.pages, { cwd: config.build.src }, page) // 在 serve 任务开始的时候先监视一些文件(源代码文件)，两个参数，1-通配符，2-对应的执行任务
    // watch('src/assets/images/**', image) // 在 serve 任务开始的时候先监视一些文件(源代码文件)，两个参数，1-通配符，2-对应的执行任务
    // watch('src/assets/fonts/**', font) // 在 serve 任务开始的时候先监视一些文件(源代码文件)，两个参数，1-通配符，2-对应的执行任务
    // watch('public/**', extra) // 在 serve 任务开始的时候先监视一些文件(源代码文件)，两个参数，1-通配符，2-对应的执行任务

    watch([
        config.build.paths.images,
        config.build.paths.fonts
    ], { cwd: config.build.src }).on('change', reload) // 同时监听三个目标文件，发生变化去调用一下 browser-sync 提供的 reload 就可以了

    // 因为 public 的 cwd 是 public 目录，所以这里单独抽取出来
    watch("**", { cwd: config.build.public }).on('change', reload) // 同时监听三个目标文件，发生变化去调用一下 browser-sync 提供的 reload 就可以了

    bs.init({ // 初始化一下开发服务器
        notify: false, // 链接状态
        port: 8888, // 修改启动端口
        // open: false, // 自动打开浏览器
        // files: 'dist/**', // 要监听的哪些文件，可以使用通配符
        server: { // 添加一些 server 配置
            // baseDir: 'dist', // 根目录
            baseDir: [config.build.temp, config.build.src, config.build.public], // 根目录, 指定为一个数组，当一个请求过来之后，先到数组中第一个目录去找，找不到再去下一个目录去找
            routes: { // 这个是优先于 baseDir 的配置，先看在 routes 里面有没有对应的配置，如果有，走这儿，否则走 baseDir 里面的目录
                '/node_modules': 'node_modules'
            }
        }
    })
}

const useref = () => {
    return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp }) // 这里要找的是编译过后的 dist 下的 html 文件，因为找 src 下面没有编译的模板没有意义，这也是为什么最后来说这个的原因
        .pipe(plugins.useref({ searchPath: [config.build.temp, '..', '.'] })) // 需要指定转换参数
        // html css js 压缩
        .pipe(plugins.if(/\.js$/, plugins.uglify())) // 会根据给定的条件执行对应的转换
        .pipe(plugins.if(/\.css$/, plugins.cleanCss())) // 会根据给定的条件执行对应的转换
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
        }))) // 会根据给定的条件执行对应的转换
        .pipe(dest(config.build.dist)) // 换个目录
}

// const compile = parallel(style, script, page)
// 开发时候用到的，只编译一部分需要编译的代码
const compile = parallel(style, script, page) // 图片和字体不需要在开发阶段去编译压缩

// 上线之前用到的，所有文件都编译
const build = series(clean, parallel(series(compile, useref), image, font, extra)) // 在组合的基础上又组合了一次

// 开发阶段构建任务
const develop = series(compile, serve)

module.exports = {
    build,
    clean,
    develop
}