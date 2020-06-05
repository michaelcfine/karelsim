// jsim.callstack.js
//
// jsim is a JavaScript "simulator" that can be used within a web browser
// and that supports variable-speed program execution, stepping through
// lines of code, setting break points, etc.
//
// This file contains the jsim code related to the call stack and stack frames
//

define(
["jsim"],
function(jsim) {

// --- Call Stack ---

// NOTE: Top-most frame on call stack is in the LAST position of the jsim.callStack array
//       In most cases, the right thing to do is walk the array BACKWARDS!
// NOTE: When the call stack is initialized/cleared, a single "global" call stack frame
//       is put/left on the stack; it is not completely empty!

jsim.CallStack = { 
    __type__: "CallStack"
    // stack
};

jsim.createCallStack = function() {
    "use strict";
	var callStack;
	callStack = Object.create(jsim.CallStack);
	callStack.stack = [];
	return callStack;
};

jsim.CallStack.clear = function() {
	"use strict";
	var oStackFrame;
	this.stack = [];
	// Add a call stack frame as a place to hang any/everything that is "global"
	oStackFrame = jsim.createStackFrame("__GLOBAL__", null, null, null);
	jsim.callStack.pushStackFrame(oStackFrame);
	return this;
};

jsim.CallStack.getCurrentStackFrame = function() {
    "use strict";
	// Note that this returns the LAST element of the array, which is the "top-most" frame
	if ( this.stack.length >= 1 ) {
    	return this.stack[this.stack.length - 1];
	} else {
	    jsim.logInternal(jsim.LOG_UNEXPECTED,
		              "callStack.getCurrentStackFrame: ERROR: Tried to get current frame when none were in the call stack");
		return null;
	}
};

// "Direct access" to a specific stack frame (by number); Not normally used!
jsim.CallStack.getStackFrame = function(frameNumber) {
    "use strict";
	if ( ( frameNumber >= 0 ) && ( frameNumber < this.stack.length ) ) {
	    return this.stack[frameNumber];
	} else {
	    jsim.logInternal(jsim.LOG_UNEXPECTED,
		              "callStack.getStackFrame: ERROR: Tried to get frame number " + frameNumber + " from a call stack with only " +
		              this.stack.length + " stack frames.");
	    return null;
	}
};

jsim.CallStack.pushStackFrame = function(oStackFrame) {
    "use strict";
	this.stack.push(oStackFrame);
	return this;
};

jsim.CallStack.popStackFrame = function() {
    "use strict";
	if ( this.stack.length >= 1 ) {
	    return this.stack.pop();
	} else {
	    jsim.logInternal(jsim.LOG_INTERNAL_ERROR, "callStack.popStackFrame: ERROR: Tried to pop a stack frame when none were on call stack.");
	    return null;
	}
};

jsim.CallStack.dump = function(bIncludeParameterValues, bIncludeLocalVariables) {
    "use strict";
    var ii, len, oStackFrame;
	len = this.stack.length;
	jsim.logMessage("Call stack has " + len + " entries: (most recent entries at bottom)");
	for ( ii = 0; ii < len; ii += 1 ) {
	    oStackFrame = this.stack[ii];
	    oStackFrame.dump(ii, bIncludeParameterValues, bIncludeLocalVariables);
	}
	return this;
};

// --- Stack Frame ---

jsim.StackFrame = { 
    __type__: "StackFrame"
    // functionName
	// parameterValuesHash
	// localVariableValuesHash
	// currentStepName
};

jsim.createStackFrame = function(sFunctionName, oParameterValuesHash, oLocalVariableValuesHash) {
	"use strict";
    var oStackFrame = Object.create(jsim.StackFrame);
	oStackFrame.functionName = sFunctionName;
	oStackFrame.parameterValuesHash = oParameterValuesHash || {};
	oStackFrame.localVariableValuesHash = oLocalVariableValuesHash || {};
	// First step within a stack frame for function XXX is always XXX_0
	oStackFrame.currentStepName = sFunctionName + '_0'; 
	return oStackFrame;
}

jsim.StackFrame.hasLocalVariable = function(sVariableName) {
    "use strict";
	if ( this.localVariableValuesHash.hasOwnProperty(sVariableName) ) {
	    return true;
	} else {
	    return false;
	}
};

// NOTE: Expects local variable to exist. Use StackFrame.hasLocalVariable() first.
jsim.StackFrame.getLocalVariableValue = function(sVariableName) {
    "use strict";
	if ( this.localVariableValuesHash.hasOwnProperty(sVariableName) ) {
	    return this.localVariableValuesHash[sVariableName];
	} else {
	    jsim.logInternal(jsim.LOG_INTERNAL_ERROR,
		                 "stackFrame.getLocalVariableValue: ERROR: Could not find local variable '" + sVariableName + "'.");
	    return null; // NOTE: Could be ambiguous!
	}
};

// NOTE: Expects local variable to exist. Use StackFrame.hasLocalVariable() first.
jsim.StackFrame.setLocalVariableValue = function(sVariableName, oValue) {
    "use strict";
	if ( this.localVariableValuesHash.hasOwnProperty(sVariableName) ) {
	    this.localVariableValuesHash[sVariableName] = oValue;
	} else {
	    jsim.logInternal(jsim.LOG_INTERNAL_ERROR,
		                 "stackFrame.getLocalVariableValue: ERROR: Could not find local variable '" + sVariableName + "'.");
	}
	return this;
};

jsim.StackFrame.hasParameter = function(sParameterName) {
    "use strict";
	if ( this.parameterValuesHash.hasOwnProperty(sParameterName) ) {
	    return true;
	} else {
	    return false;
	}
};

// NOTE: Expects parameter to exist. Use StackFrame.hasParameter() first.
jsim.StackFrame.getParameterValue = function(sParameterName) {
    "use strict";
	if ( this.parameterValuesHash.hasOwnProperty(sParameterName) ) {
	    return this.parameterValuesHash[sParameterName];
	} else {
	    jsim.logInternal(jsim.LOG_INTERNAL_ERROR,
		              "stackFrame.getParameterValue: ERROR: Could not find parameter '" + sVariableName + "'.");
	    return null; // NOTE: Could be ambiguous!
	}
};

// NOTE: Expects parameter to exist. Use StackFrame.hasParameter() first.
jsim.StackFrame.setParameterValue = function(sParameterName, oValue) {
    "use strict";
	if ( this.parameterValuesHash.hasOwnProperty(sParameterName) ) {
	    this.parameterValuesHash[sParameterName] = oValue;
	} else {
	    jsim.logInternal(jsim.LOG_INTERNAL_ERROR,
		              "stackFrame.setParameterValue: ERROR: Could not find parameter '" + sParameterName + "'.");
	}
	return this;
};

jsim.StackFrame.addLocalVariable = function(sVariableName, oInitialValue) {
    "use strict";
	this.localVariableValuesHash[sVariableName] = oInitialValue;
	return this;
};
		
jsim.StackFrame.dump = function(level, includeParameterValues, includeLocalVariables) {
    "use strict";
	var padding, ii, len;
	padding = jsim.repeat("    ", level);
    jsim.logMessage(padding + this.functionName);
	if ( includeParameterValues ) {
	    len = jsim.getNumOwnProperties(this.parameterValuesHash);
		if ( len > 0 ) {
		    for (var parameterName in this.parameterValuesHash) {
	            if ( this.parameterValuesHash.hasOwnProperty(parameterName) ) {
	    	        jsim.logMessage(padding + " " + "P:" + parameterName + "=" + this.parameterValuesHash[parameterName]);
				}
		    }
		} else {
		    jsim.logMessage(padding + " " + "P:" + "No parameters");
		}
	}
	if ( includeLocalVariables ) {
	    len = jsim.getNumOwnProperties(this.localVariableValuesHash);
		if ( len > 0 ) {
		    for (var variableName in this.localVariableValuesHash) {
	            if ( this.localVariableValuesHash.hasOwnProperty(variableName) ) {
	    	        jsim.logMessage(padding + " " + "V:" + variableName + "=" + this.localVariableValuesHash[variableName]);
				}
		    }
		} else {
		    jsim.logMessage(padding + " " + "V:" + "No variables");
		}
	}
	return this;
};

return jsim;

});
