const gulp = require('gulp');
const path = require('path');

const ts = require('gulp-typescript');
const typescript = require('typescript');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');
const runSequence = require('run-sequence');
const es = require('event-stream');
const vsce = require('vsce');
const nls = require('vscode-nls-dev');

const tsProject = ts.createProject('./tsconfig.json', { typescript });

const inlineMap = true;
const inlineSource = false;
const outDest = 'out';

// If all VS Code langaues are support you can use nls.coreLanguages
const languages = [
	{ id: "zh-tw", folderName: "cht", transifexId: "zh-hant" },
    { id: "zh-cn", folderName: "chs", transifexId: "zh-hans" },
    { id: "fr", folderName: "fra" },
    { id: "de", folderName: "deu" },
    { id: "it", folderName: "ita" },
    { id: "es", folderName: "esp" },
    { id: "ja", folderName: "jpn" },
    { id: "ko", folderName: "kor" },
    { id: "ru", folderName: "rus" },
    //{ id: "bg", folderName: "bul" }, // VS Code supports Bulgarian, but VS is not currently localized for it
	{ id: "hu", folderName: "hun" }, // VS Code supports Hungarian, but VS is not currently localized for it
    { id: "pt-br", folderName: "ptb", transifexId: "pt-BR" },
    { id: "tr", folderName: "trk" },
    { id: "cs", folderName: "csy" },
    { id: "pl", folderName: "plk" }];

const cleanTask = function () {
	return del(['out/**', 'package.nls.*.json', ' Autodesk.autolispext*.vsix']);
}

const internalCompileTask = function () {
	return doCompile(false);
};

const internalNlsCompileTask = function () {
	return doCompile(true);
};

const addI18nTask = function () {
	return gulp.src(['package.nls.json'])
		.pipe(nls.createAdditionalLanguageFiles(languages, 'i18n'))
		.pipe(gulp.dest('.'));
};

const buildTask = gulp.series(cleanTask, internalNlsCompileTask, addI18nTask);

const doCompile = function (buildNls) {
	var r = tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject()).js
		.pipe(buildNls ? nls.rewriteLocalizeCalls() : es.through())
		.pipe(buildNls ? nls.createAdditionalLanguageFiles(languages, 'i18n', 'out') : es.through());

	if (inlineMap && inlineSource) {
		r = r.pipe(sourcemaps.write());
	} else {
		r = r.pipe(sourcemaps.write("../out", {
			// no inlined source
			includeContent: inlineSource,
			// Return relative source map root directories per file.
			sourceRoot: "../src"
		}));
	}

	return r.pipe(gulp.dest(outDest));
}

const vscePublishTask = function () {
	return vsce.publish();
};

const vscePackageTask = function () {
	return vsce.createVSIX();
};

gulp.task('default', buildTask);

gulp.task('clean', cleanTask);

gulp.task('compile', gulp.series(cleanTask, internalCompileTask));

gulp.task('build', buildTask);

gulp.task('publish', gulp.series(vscePublishTask));

gulp.task('package', gulp.series(vscePackageTask));