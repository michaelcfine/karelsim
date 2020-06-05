// jsim.postparse.js
//
// jsim is a JavaScript "simulator" that can be used within a web browser
// and that supports variable-speed program execution, stepping through
// lines of code, setting break points, etc.
//
// This file contains the jsim code related to the "post processing" done
// after parsing program source using a given grammar (as defined by PEG)
// EXCEPT code related to code generation (step generation), which is
// in jsim.codegen.js
//

define(
["jsim"],
function(jsim) {

// "Internal" to jsim.postParseIfNecessary()
// Relies on the data structures built by the PEG-based JavaScript parser 
// at https://raw.github.com/kassens/javascript-formatter/master/javascript.pegjs
jsim.addBackPointers = function() {
    "use strict";
	
	function addBackPointers_(node, parentNode) {
		"use strict";
		var key, child, ii, len;

		if ( jsim.isArray(node) ) {
			for ( ii = 0, len = node.length; ii < len; ii += 1 ) {
				addBackPointers_(node[ii], parentNode);
			}
		} else if ( ( jsim.isObject(node) ) && ( node.hasOwnProperty("type") ) ) {
		    node.jsimParent = parentNode;
			for ( key in node ) {
				if ( node.hasOwnProperty(key) ) {
					child = node[key];
					if ( key !== "jsimParent" /* Avoid recursion */              && 
					     key !== "type"       /* Known: No 'real' nodes below */ && 
					     key !== "line"       /* Known: No 'real' nodes below */ ) {
						addBackPointers_(child, node);
					}
				}
			}
		}
	}
	
	addBackPointers_(this.syntax, null);
};

// Fill our function table
// "Internal" to jsim.postParseIfNecessary()
// Relies on the data structures built by the PEG-based JavaScript parser 
// at https://raw.github.com/kassens/javascript-formatter/master/javascript.pegjs
jsim.loadFunctionTable = function() {
    "use strict";
	var syntax, params, numParams, jsimParams;
	
	function traverseCallback(node, level, parent) {
		"use strict";
		var type, funcDecl, pp, numParams, param, jsimParams;
		if ( node === null ) { return true; } // Keep going
		if ( ! node.hasOwnProperty("type") ) { return true; } // Keep going
		type = node.type;
		if ( type === "Function" ) {
		    funcDecl = jsim.findParentFunctionDeclaration(node.jsimParent);
			if ( funcDecl === null ) {
                // Global function declaration
				params = node.params;
			    numParams = params.length;
			    if ( numParams > 0 ) {
			        // Walk esprima parameter structure... we just want names
				    jsimParams = [];
				    for ( pp = 0; pp < numParams; pp += 1 ) {
				        param = params[pp];
				        jsimParams.push(param);
				    }
			    } else {
			        // Function takes no parameters
			        jsimParams = [];
			    }
		        jsim.functionTable.addFunctionV(node.name, jsimParams);
			} else {
			    throw jsim.createException("jsim.loadFunctionTable", 
				        "Nested functions are not supported.", [node.id.name]);
			}
        }
		return true; // Keep going
	}

	// Start fresh
	this.functionTable.clear();
	
	syntax = this.syntax;
	
	jsim.validateObject  (syntax,      "jsim.loadFunction", "syntax");
	jsim.validateProperty(syntax.type, "jsim.loadFunction", "syntax.type", ["Program"]);
	
	// DEBUG: Next line is handy
	// jsim.dumpNode(syntax);
	
	// Add top-level "function", __GLOBAL__
	jsim.functionTable.addFunctionV("__GLOBAL__", []);
	// Find all functions within code and add them along with info about 
	// their parameters (vars come later)
	jsim.traverse(syntax, traverseCallback);
};

// "Internal" to jsim.postParseIfNecessary()
jsim.addLocalVariablesToFunctionTable = function() {
    "use strict";

	function traverseCallback(node, level, parent) {
		"use strict";
		var type, funcDecl;
		if ( node === null ) { return; }
		if ( ! node.hasOwnProperty("type") ) { return; }
		type = node.type;
		if ( type === "VariableDeclaration" ) {
		    funcDecl = jsim.findParentFunctionDeclaration(node);
			if ( funcDecl === null ) {
                // Global variable declarator
				jsim.functionTable.getFunction("__GLOBAL__").addVariable(node.name);
			} else {
			    // Variable declarator within function
				jsim.functionTable.getFunction(funcDecl.name).addVariable(node.name);
			}
        }
		return true; // Keep going
	}
	
	jsim.traverse(jsim.syntax, traverseCallback);
};

// After jsim.parseIfNecessary() runs and jsim.syntax object is built, 
// do some more processing which gets us ready to reset or run the program
jsim.postParseIfNecessary = function() {
    "use strict";
	try {
	    if ( this.tsLastPostParse >= this.tsLastSource ) { return; }
		
			console.log("[BEGIN]");

		    console.log("\nProgram Source:");
	        console.log(jsim.pgm);
			
		this.addBackPointers();
	
			console.log("\nSyntax Tree With Back Pointers:");
			console.log(this.syntax);
			
		this.loadFunctionTable();
		this.addLocalVariablesToFunctionTable();
	
			//QQQ console.log("\nFunction Table With Local Variables:");
			console.log("\nFunction Table:");
			this.functionTable.dump();
		
		this.generateSteps();
	
			console.log("\nSteps Hash:");
			this.stepsHash.dump();

			console.log("\n[END]");
	
		this.tsLastPostParse = this.now();	
	} catch ( ex ) {
	    console.log("jsim.postParse: Exception: ", ex);
		console.log("Exception object:");
		console.log(ex);
		// QQQ Clean out jsim object of any partial work!
		throw jsim.createException("jsim.postParseIfNecessary", "Exception", [ex]);
	}
}

return jsim;

});
