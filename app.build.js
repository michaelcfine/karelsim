({
	appDir: "./src/js",    // Usually just "./src"
	baseUrl: ".",          // Usually "js"
	dir: "./dist/js",      // Usually "./dist"
	keepBuildDir: true,    // Usually false

    paths: {
		"jquery":                     "libs/jquery",
		"jquery-ui":                  "libs/jquery-ui-1.7.2.custom.min",
		"bootstrap":                  "libs/bootstrap.min",
		"plugins":                    "libs/plugins",
		"css3-mediaqueries":          "libs/css3-mediaqueries",
		"Ember":                      "libs/ember-0.9.7.1.min",
		"peg":                        "libs/peg/peg-0.7.0",
		"linedtextarea":              "libs/jquery-linedtextarea/jquery-linedtextarea"
	},

	optimize:"uglify",     /* uglify, closure, closure.keepLines, none */
	modules: [
	    {
		    name: "karel",
		    exclude: []
		}
	]
})
