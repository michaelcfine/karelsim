require.config({
	baseUrl: "/js",
	paths: {
		"jquery":             "libs/jquery",
		"jquery-ui":          "libs/jquery-ui-1.7.2.custom.min",
		"bootstrap":          "libs/bootstrap.min",
		"plugins":            "libs/plugins",
		"css3-mediaqueries":  "libs/css3-mediaqueries",
		"Ember":              "libs/ember-0.9.7.1.min",

		"peg":                "libs/peg/peg-0.7.0",
		"linedtextarea":      "libs/jquery-linedtextarea/jquery-linedtextarea"
	},
	waitSeconds: 15
});

require(
	[
		  "jquery"
		, "jquery-ui"
		, "bootstrap"
		, "plugins"
		, "css3-mediaqueries"

		, "EmberModule"

		, "peg"
		, "linedtextarea"

		, "jsim"
		, "jsim.functiontable"
		, "jsim.callstack"
		, "jsim.stepshash"
		, "jsim.var"
		, "jsim.parse"
		, "jsim.postparse"
		, "jsim.codegen"

		, "worldsim"
		, "worldsim.karelsim"

		, "karelsim"
		, "karelsim.events"
		, "karelsim.impexp"
		, "karelsim.public"
		, "karelsim.worlds"
	],

	function ($, jqui, b, p, mq,

			  Em,

			  peg, lined,

			  jsim,
			  jsimfunctiontable, jsimcallstack, jsimstepshash, jsimvar, 
			  jsimparse, jsimpostparse, jsimcodegen,
			  
			  WORLDSIM, worldsimkarelsim,

			  karelsim,
			  karelsimevents, karelsimimpexp,
			  karelsimpublic, karelsimworlds) {
		"use strict";
		WORLDSIM.worldController.initExplicit();
		karelsim.init();
	}
);

