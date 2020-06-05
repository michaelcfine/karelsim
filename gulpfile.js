const gulp = require('gulp');
const handlebars = require('gulp-compile-handlebars');
const rename = require('gulp-rename');
const clean = require('gulp-clean');

const templateData = require('./templateData.js');

// Clean out dist/ directory
function cleanTask(cb) {
	return gulp.src('dist/*', { read: false }).pipe(clean());
	cb();
}

// Build HTML files
function buildHtmlTask(cb) {
	gulp.src('./src/pages/**/*.hbs')
		.pipe(handlebars(templateData, {
			helpers: {
				// Used to "protect" client-side Handlebars use within Ember type=text/x-handlebars scripts
				raw: function(content) {
					return content.fn();
				}
			},
			ignorePartials: false,
			batch: ['./src/partials']
		}))
		.pipe(rename(function(path) {
			if ( path.basename === 'index' ) {
				path.extname = '.html';
			} else {
				path.dirname += '/' + path.basename;
				path.basename = 'index';
				path.extname = '.html';
			}
		}))
		.pipe(gulp.dest('./dist'));	
	cb();
}

// Build JavaScript files
function buildJsTask(cb) {
	// Legacy JS build means we don't need this              <<<=== NOTE!!! See package.json::scripts::build*
	//gulp.src('./src/js/**/*')
	//	.pipe(gulp.dest('./dist/js'));
	cb();
}

// Build CSS files
function buildCssTask(cb) {
	gulp.src('./src/css/**/*')
		.pipe(gulp.dest('./dist/css'));
	cb();
}

// Build Images
function buildImagesTask(cb) {
	gulp.src('./src/images/**/*')
		.pipe(gulp.dest('./dist/images'));
	cb();
}



exports.clean = cleanTask;

exports.buildHtml    = buildHtmlTask;
exports.buildJs	     = buildJsTask;
exports.buildCss     = buildCssTask;
exports.buildImages  = buildImagesTask;
exports.build = gulp.series(buildHtmlTask, buildJsTask, buildCssTask, buildImagesTask);

exports.default = gulp.series(cleanTask, buildHtmlTask, buildJsTask, buildCssTask, buildImagesTask);
