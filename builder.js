const sass = require("sass")
const fs = require("fs")
const defaultOutputFolder = 'css'
const buildPath = 'build'

const capitalize = s =>  `${s.charAt(0).toUpperCase()}${s.slice(1)}`
const toCapitalCase = s => s.split('-').map(capitalize).join(' ')

const buildThemes = (path, outPath, prefix = false) => {
  const themesInfo = []
  fs.readdirSync(path).forEach(fileName => {
    const pathName = `${path}/${fileName}`
    const stat = fs.lstatSync(pathName)
    if (stat.isFile(pathName)) {
      const name = fileName.replace('.scss', '')
      const themeName = prefix ? prefix : name
      const themeClass = `base16-${themeName}`
      const outFile = `${outPath}/${themeName}.css`
      const buildFile = `${buildPath}/${themeName}.scss`
      const generator = prefix ? `@include gen-colorscheme('${name}');` : '@include gen-class;'
      const themeInfo = {
        name: themeClass,
        outFile: outFile,
        buildFile: buildFile,
        title: toCapitalCase(themeName),
        mode: prefix ? name : ''
      }
      const data = `
      @import '${pathName}';
      @import 'scss/mixins.scss';

      .${themeClass} {
        ${generator}
      }
    `
      const result = sass.renderSync({ data })
      fs.appendFileSync(outFile, `${result.css.toString()}\n\n`)
      fs.appendFileSync(buildFile, `${result.css.toString()}\n\n`)
      themesInfo.push(themeInfo)
    } else {
      buildThemes(pathName, outPath, fileName).forEach(info => themesInfo.push(info))
    }
  })
  return themesInfo
}

const regroupData = data => {
  const groupedInfo = {}
  const result = []
  data.forEach(item => {
    const key = item.name
    if (typeof groupedInfo[key] === 'undefined') {
      groupedInfo[key] = {
        name: item.name,
        title: item.title,
        file: item.outFile,
        buildFile: item.buildFile,
        modes: [item.mode]
      }
    } else {
      groupedInfo[key].modes.push(item.mode)
    }
  })
  for ([key, item] of Object.entries(groupedInfo)) {
    result.push(item)
  }
  return result
}

const createImportAll = (themesInfo, outPath) => {
  const data = themesInfo.map(info => `@import '${info.buildFile}';`).join('\n')
  const result = sass.renderSync({ data })
  fs.writeFileSync(`${outPath}/all.css`, result.css.toString())
}

const removeBuildData = item => {
  return {
    name: item.name,
    title: item.title,
    file: item.file,
    modes: item.modes
  }
}

// Ensures that we are doing a clean build
if (fs.existsSync(defaultOutputFolder)) {
  fs.rmdirSync(defaultOutputFolder, { recursive: true })
}
fs.mkdirSync(defaultOutputFolder)
fs.mkdirSync(buildPath)

const info = buildThemes('scss/variables', defaultOutputFolder)
const groupedInfo = regroupData(info)
fs.writeFileSync('themes.json', JSON.stringify(groupedInfo.map(removeBuildData)))
createImportAll(groupedInfo, defaultOutputFolder)
fs.rmdirSync(buildPath, { recursive: true })
