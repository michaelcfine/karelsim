// jsim.functiontable.js
//
// jsim is a JavaScript "simulator" that can be used within a web browser
// and that supports variable-speed program execution, stepping through
// lines of code, setting break points, etc.
//
// This file contains the jsim code related to the function table and functions
//
// NOTE: "function" is spelled "funktion" to avoid any problems with the JS 
//       reserved word, 'function'
//

define(
["jsim"],
function(jsim) {

// --- Function Table ---

jsim.FunctionTable = { 
    __type__: "FunctionTable"
    // hash
};

jsim.createFunctionTable = function() {
    "use strict";
	var functionTable = Object.create(jsim.FunctionTable);
	functionTable.hash = {};
	return functionTable;
};

jsim.FunctionTable.clear = function() {
	"use strict";
	this.hash = {};
	// Add a funktion object so we can add a "global" stack frame to the call stack
	this.addFunctionV("__GLOBAL__", []);
	return this;
};
	
jsim.FunctionTable.addFunctionO = function(sFunctionName, oFunktion) {
	"use strict";
	this.hash[sFunctionName] = oFunktion;
	return oFunktion;
};

jsim.FunctionTable.addFunctionV = function(sFunctionName, arrParameterNames) {
    "use strict";
	var oFunktion;
	oFunktion = jsim.createFunktion(sFunctionName, arrParameterNames);
	this.addFunctionO(sFunctionName, oFunktion);
	return oFunktion;
};

jsim.FunctionTable.getFunction = function(sFunctionName) {
    "use strict";
	if ( this.hash.hasOwnProperty(sFunctionName) ) {
	    return this.hash[sFunctionName];
	} else {
		return null;
	}
};

jsim.FunctionTable.dump = function() {
	"use strict";
	var numFunctions;
	numFunctions = jsim.getNumOwnProperties(this.hash);
	if ( numFunctions > 0 ) {
		jsim.logMessage("The function table contains " + numFunctions + " entries:");
		for (var sFunctionName in this.hash) {
			if (this.hash.hasOwnProperty(sFunctionName)) {
			    this.hash[sFunctionName].dump();
			}
		}
	} else {
		jsim.logMessage("No functions in function table.");
	}
	return this;
};

// --- Function ---

jsim.Funktion = { 
    __type__: "Funktion"
    // functionName
	// parameterNames
	// variableNames
};

jsim.createFunktion = function(sFunctionName, arrParameterNames) {
	"use strict";
    var funktion = Object.create(jsim.Funktion);
	funktion.functionName = sFunctionName;
	funktion.parameterNames = arrParameterNames;
	funktion.variableNames = [];
	return funktion;
};

jsim.Funktion.addParameter = function(sParameterName) {
    "use strict";
	this.parameterNames.push(sParameterName);
	return this;
};

jsim.Funktion.addVariable = function(sVariableName) {
    "use strict";
	this.variableNames.push(sVariableName);
	return this;
};

jsim.Funktion.dump = function() {
    "use strict";
    jsim.logMessage("Function " + this.functionName +
                    "\n    Parameters: " + this.parameterNames.join(", ") + 
					"\n    Variables: " + this.variableNames.join(", "));
	return this;
};

return jsim;

});
