// jsim.parse.js
//
// jsim is a JavaScript "simulator" that can be used within a web browser
// and that supports variable-speed program execution, stepping through
// lines of code, setting break points, etc.
//
// This file contains the jsim code related to parsing program source
// using a given grammar (as defined by PEG)
//
//

define(
["jsim"],
function(jsim) {

// Convenient cover for clients to call; they don't have to know about 
// internal optimizations
jsim.parse = function() {
    this.parseIfNecessary();
};

// Throws exception if there is a syntax error
jsim.parseIfNecessary = function() {
    "use strict";
	if ( this.tsLastParse >= this.tsLastSource ) { return; }
	
	if ( ( typeof this.pgm === "undefined" ) || ( this.pgm === null ) ) {
        throw jsim.createException("jsim.parseIfNecessary", 
		        "Set program source before parsing", []);
    }		
	try {
	    // Parse the program text using PEG, using the parser created by grammar 
		// given by setGrammar(). Get back a syntax tree object
	    var syntax = this.parser.parse(this.pgm);
	    this.syntax = syntax;
		this.tsLastParse = this.now();
	} catch ( error ) {
	    // error is an esprima Error object
		console.log("jsim.parseIfNecessary: Exception:", error);
		throw jsim.createException("jsim.parseIfNecessary", 
		        "Syntax Error", [error.message, error.line]);
	}
};

return jsim;

});
