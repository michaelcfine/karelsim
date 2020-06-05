// jsim.var.js
//
// jsim is a JavaScript "simulator" that can be used within a web browser
// and that supports variable-speed program execution, stepping through
// lines of code, setting break points, etc.
//
// This file contains the jsim code related to handling variables and function parameters
//

define(
["jsim"],
function(jsim) {

// === Variable Declarations, Gets, and Sets ===

jsim.addLocalVariableWithoutValue = function(sVariableName) {
    "use strict";
	jsim.addLocalVariable(sVariableName, null);
};

jsim.addLocalVariable = function(sVariableName, oInitialValue) {
    "use strict";
	var oCurrentStackFrame;
	oCurrentStackFrame = jsim.callStack.getCurrentStackFrame();
	if ( oCurrentStackFrame.hasLocalVariable(sVariableName) ) {
	    // This variable is already declared as a local variable in 
		// the current call stack frame...error!
		jsim.logInternal(jsim.LOG_UNEXPECTED,
		              "addLocalVariable: ERROR: " + sVariableName + 
					  " is already defined as a local variable.");
		return;
	} else if ( oCurrentStackFrame.hasParameter(sVariableName) ) {
	    // This variable is already declared as a parameter in 
		// the current call stack frame... error!
		jsim.logInternal(jsim.LOG_UNEXPECTED,
		              "addLocalVariable: ERROR: " + sVariableName + 
					  " is already defined as a parameter.");
		return;
	} else {
	    // Add this variable as a local variable in the current 
		// call stack frame and assign its initial value
		oCurrentStackFrame.addLocalVariable(sVariableName, oInitialValue);
        return;
	}
};

jsim.getParameterValue = function(sParameterName) {
    "use strict";
    var oCurrentStackFrame, sFunctionName;
	oCurrentStackFrame = jsim.callStack.getCurrentStackFrame();
	sFunctionName = oCurrentStackFrame.functionName;
	if ( oCurrentStackFrame.hasParameter(sParameterName) ) {
        // Found parameter with this name... return value		
	    jsim.logInternal(jsim.LOG_GET,
		              "jsim.getParameterValue: " + sParameterName + 
					  " found as a parameter in function " + sFunctionName);
		return oCurrentStackFrame.getParameterValue(sParameterName);
	} else {
	    // No parameter with the given name exists
	    jsim.logInternal(jsim.LOG_GET,
		              "jsim.getParameterValue: " + sParameterName + 
					  " could not be found as a parameter in function " + sFunctionName);
		throw jsim.createException("getParameterValue", "NO-PARAMETER", [sParameterName]);
	}
};

jsim.getLocalVariableValue = function(sLocalVariableName) {
    "use strict";
    var oCurrentStackFrame, sFunctionName;
	oCurrentStackFrame = jsim.callStack.getCurrentStackFrame();
	sFunctionName = oCurrentStackFrame.functionName;
	if ( oCurrentStackFrame.hasLocalVariable(sLocalVariableName) ) {
		// Found local variable with this name... return value
		jsim.logInternal(jsim.LOG_GET,
		              "jsim.getLocalVariableValue: " + sLocalVariableName +
					  " found as local variable in function " + sFunctionName);
		return oCurrentStackFrame.getLocalVariableValue(sLocalVariableName);
	} else {
		// No local variable with the given name exists
		jsim.logInternal(jsim.LOG_GET,
		              "jsim.getLocalVariableValue: " + sLocalVariableName +
					  " could not be found as a local variable in function " +
					  sFunctionName);
		throw jsim.createException("getLocalVariableValue",
		        "NO-LOCAL-VARIABLE", [sLocalVariableName]);
	}
};

jsim.getAnyVariableValue = function(sVariableName) {
    "use strict";
    var ii, len, oStackFrame, sFunctionName, hVariableValuesHash;
	len = jsim.callStack.length;
	for ( ii = len-1; ii >= 0; ii -= 1 ) {
	    oStackFrame = jsim.callStack.getStackFrame(ii);
		sFunctionName = oStackFrame.functionName;
		hVariableValuesHash = oStackFrame.localVariableValuesHash;
		if ( oStackFrame.hasLocalVariable(sLocalVariableName) ) {
		    // Found variable with this name... return value
			jsim.logInternal(jsim.LOG_GET,
			              "jsim.getAnyVariableValue: " + sVariableName + 
						  " found as variable in function " + sFunctionName);
			return oStackFrame.getLocalVariableValue(sLocalVariableName);
		//} else {
		    // Do nothing so that loop continues down the call stack
		}
	}
	// If we get here, we could not find a variable with the given name 
	// anywhere in the call stack
	jsim.logInternal(jsim.LOG_GET,
	              "jsim.getAnyVariableValue: " + sVariableName + 
				  " could not be found as a variable anywhere in call stack");
	throw jsim.createException("getAnyVariableValue", "NO-VARIABLE", [sVariableName]);
};

// Main get() call to get a variable's value. The variable name given 
// could be a local variable, a parameter name, or the name of a variable
// in a calling function
jsim.getVariableValue = function(sVariableName) {
    "use strict";
	var val;
	try {
	    val = jsim.getLocalVariableValue(sVariableName);
		return val;
	} catch ( ex ) {
	    jsim.logInternal(jsim.LOG_GET,
		              "jsim.getVariableValue: " + sVariableName + 
					  " is not a local variable in current call stack frame");
	}
	try {
	    val = jsim.getParameterValue(sVariableName);
		return val;
	} catch ( ex ) {
	    jsim.logInternal(jsim.LOG_GET,
		              "jsim.getVariableValue: " + sVariableName + 
					  " is not a local variable in current call stack frame");
	}
	try {
	    val = jsim.getAnyVariableValue(sVariableName);
		return val;
	} catch ( ex ) {
	    jsim.logInternal(jsim.LOG_GET,
		              "jsim.getVariableValue: " + sVariableName + 
					  " is not a variable anywhere in the call stack");
		throw jsim.createException("getVariableValue", 
		        "COULD-NOT-GET-VARIABLE-VALUE", [sVariableName]);
	}
};

// Returns true if the given variable name is the name of either a local variable or 
// an argument within the context of the given node in the parse tree.
// E.g., f(a) { ... } -- a is a param within the context of f, but not some other fcn
jsim.isVariable = function(sVariableName, oNode) {
    "use strict";
	var functionNode, functionName, functionTable, funktion;
	functionNode = this.findParentFunctionDeclaration(oNode);
	functionName = functionNode.name;
    functionTable = this.functionTable;
	funktion = functionTable.getFunction(functionName);
	if ( this.indexOf(funktion.variableNames, sVariableName) !== -1 ) {
	    // sVariableName is a local variable within "parent"
		// function of the node oNode
		return true;
	} else if ( this.indexOf(funktion.parameterNames, sVariableName) !== -1 ) {
	    return true;
	} else {
	    return false;
	}
};

jsim.setParameterValue = function(sParameterName, oValue) {
    "use strict";
    var oCurrentStackFrame, sFunctionName;
	oCurrentStackFrame = jsim.callStack.getCurrentStackFrame();
	sFunctionName = oCurrentStackFrame.functionName;
    if ( oCurrentStackFrame.hasParameter(sParameterName) ) {
        // Found parameter with this name... set its value	
	    jsim.logInternal(jsim.LOG_SET,
		              "jsim.setParameterValue: " + sParameterName + 
					  " found as a parameter in function " + sFunctionName);
		oCurrentStackFrame.setParameterValue(sParameterName, oValue);
		return;
	} else {
	    // No parameter with the given name exists
	    jsim.logInternal(jsim.LOG_SET,
		              "jsim.setParameterValue: " + sParameterName + 
					  " could not be found as a parameter in function " + sFunctionName);
		throw jsim.createException("setParameterValue",
		        "NO-PARAMETER", [sParameterName, oValue]);
	}
};

jsim.setLocalVariableValue = function(sLocalVariableName, oValue) {
    "use strict";
    var oCurrentStackFrame, sFunctionName;
	oCurrentStackFrame = jsim.callStack.getCurrentStackFrame();
	sFunctionName = oCurrentStackFrame.functionName;
    if ( oCurrentStackFrame.hasLocalVariable(sLocalVariableName) ) {
		// Found local variable with this name... set its value
		jsim.logInternal(jsim.LOG_SET,
		              "jsim.setLocalVariableValue: " + sLocalVariableName + 
					  " found as local variable in function " + sFunctionName);
		oCurrentStackFrame.setLocalVariableValue(sLocalVariableName, oValue);
		return;
	} else {
		// No local variable with the given name exists
		jsim.logInternal(jsim.LOG_SET,
		              "jsim.setLocalVariableValue: " + sLocalVariableName + 
					  " could not be found as a local variable in function " + sFunctionName);
		throw jsim.createException("setLocalVariableValue", 
		        "NO-LOCAL-VARIABLE", [sLocalVariableName, oValue]);
	}
};

jsim.setAnyVariableValue = function(sVariableName) {
    var ii, len, oStackFrame, sFunctionName;
	len = jsim.callStack.length;
	for ( ii = len-1; ii >= 0; ii -= 1 ) {
	    oStackFrame = jsim.callStack.getStackFrame(ii);
		sFunctionName = oStackFrame.functionName;
		if ( oStackFrame.hasLocalVariable(sVariableName) ) {
		    // Found variable with this name... set its value
			jsim.logInternal(jsim.LOG_SET,
			              "jsim.setAnyVariableValue: " + sVariableName + 
						  " found as variable in function " + sFunctionName);
			oStackFrame.setLocalVariableValue(sVariableName, oValue);
			return;
		//} else {
		    // Do nothing so that loop continues down the call stack
		}
	}
	// If we get here, we could not find a variable with the given name
	// anywhere in the call stack
	jsim.logInternal(jsim.LOG_SET,
	              "jsim.setAnyVariableValue: " + sVariableName + 
				  " could not be found as a variable anywhere in call stack");
	throw jsim.createException("setAnyVariableValue",
        	"NO-VARIABLE", [sVariableName, oValue]);
};

// Main set() call to set a variable's value. The variable name given
// could be a local variable, a parameter name, or the name of a variable
// in a calling function
jsim.setVariableValue = function(sVariableName, oValue) {
    "use strict";
	try {
		jsim.setLocalVariableValue(sVariableName, oValue);
		return;
	} catch ( ex ) {
	    jsim.logInternal(jsim.LOG_SET,
		              "jsim.setVariableValue: " + sVariableName + 
					  " is not a local variable in current call stack frame");
	}
	try {
	    jsim.setParameterValue(sVariableName, oValue);
		return;
	} catch ( ex ) {
	    jsim.logInternal(jsim.LOG_SET,
		              "jsim.setVariableValue: " + sVariableName + 
					  " is not a local variable in current call stack frame");
	}
	try {
	    jsim.setAnyVariableValue(sVariableName);
        return;
	} catch ( ex ) {
	    jsim.logInternal(jsim.LOG_SET,
		              "jsim.setVariableValue: " + sVariableName + 
					  " is not a variable anywhere in the call stack");
		throw jsim.createException("setVariableValue", 
		        "COULD-NOT-SET-VARIABLE-VALUE", [sVariableName, oValue]);
	}
};

// === Shortcuts used within generated step functions ===

jsim._var    = jsim.addLocalVariable;
jsim._get    = jsim.getVariableValue;
jsim._set    = jsim.setVariableValue;

return jsim;

});
