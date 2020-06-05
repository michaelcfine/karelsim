// jsim.js
//
// JavaScript "simulator" that can be used within a web browser
// and that supports variable-speed program execution, stepping through
// lines of code, setting break points, etc.
//
// Created: 12/15/2012
//      by: Mike Fine (michaelcfine@gmail.com)
//

define(
[],
function() {

// === Generic ===

if (typeof Object.create !== "function") {
    Object.create = function (o) {
	    function F() {}
		F.prototype = o;
		return new F();
    };
}



// === Global jsim object ===

var jsim = {
    // === "Global" variables within top-level jsim variable ===
	grammar:           null,  // Set with setGrammar(), using PEG grammar string
	parser:            null,  // Set internally within setGrammar(); PEG parser function
    pgm:               null,  // Set with setProgramSource()
    functionTable:     null,  // Array of functions and their signature information (params)
    callStack:         null,  // Used to track function calls and returns when simulating
	exprStack:         null,  // Used to track call/return values (for user-defined funcs)
	stepsHash:         null,  // "Hash" of individual steps that will be simulated
	isPaused:          false, // Is execution paused?
	stepDelay:         800,   // Controls speed of step playback, in ms
	
	tsLastGrammar:     (new Date()).getTime()-0,  // Timestamp when setGrammar was last used
	tsLastSource:      (new Date()).getTime()-1,  // Timestamp when setProgramSource was last used
	tsLastParse:       (new Date()).getTime()-2,  // Timestamp when program was last parsed
	tsLastPostParse:   (new Date()).getTime()-3,  // Timestamp when program was last post-parsed
	
	// Bit masks for which piece of logging/debugging we want...
	LOG_INTERNAL_ERROR:   1,
	LOG_UNEXPECTED:       2,
	LOG_SET:              4,
	LOG_GET:              8,
	LOG_CALL_RETURN:     16,
	LOG_EXEC:            32,
	LOG_ALL:             63,  // Double the last individual flag minus one
	
	debugLevel:           0,  // 0=Off. LOG_ALL=On. LOG_XXX + LOG_YYY for specific things to log
	maxSanity:          500,  // Used to prevent infinite loops; max counter value 
	
	// Callbacks to be supplied by jsim client (default implementations provided)
	fcnPreStep:        function() { },
	fcnEndOfExecution: function() { },
	fcnLogMessage:     function(msg) { console.log(msg); }  
};



// === Generic within jsim object ===

// StringBuilder "class"
jsim.StringBuilder = function(value) { this.strings = new Array(""); this.append(value); }
jsim.StringBuilder.prototype.append = function(value) { if (value) { this.strings.push(value); } }
jsim.StringBuilder.prototype.clear = function() { this.strings.length = 1; }
jsim.StringBuilder.prototype.toString = function() { return this.strings.join(""); }

// now -- Return current timestamp
jsim.now = function() { return (new Date()).getTime(); };

// makeFunction -- Make a real JS function out of a string (like eval); returns function
jsim.makeFunction = function(ss) {
    "use strict";
	var tmpFunc = new Function(ss);
	return tmpFunc;
};

// runFunction -- Make and execute a real JS function out of a string
// NOTE: Does not support functions with arguments
jsim.runFunction = function(ss) {
    "use strict";
	var fcn = jsim.makeFunction(ss);
	return fcn();
};
	
// Return string with given string/char repeated a number of times
// Note the nifty trick found on the InterWeb ;)
jsim.repeat = function(str, numTimes) {
    "use strict";
    return Array(numTimes+1).join(str);
}

jsim.getNumOwnProperties = function(obj) {
    "use strict";
	var cnt = 0;
	for (var key in obj) {
	    if ( obj.hasOwnProperty(key) ) {
    	    cnt += 1;
		}
	}
	return cnt;
}

jsim.createException = function(fcnName, message, arrParamValues) {
    "use strict";
	var msg;
	msg = fcnName + ": " + message;
	if ( ( typeof arrParamValues !== 'undefined' ) && ( arrParamValues !== null ) ) {
	    msg = msg + " (" + arrParamValues.join(", ") + ")";
	}
	var ex = {
	    message: message, 
		functionName: fcnName,
		parameterValues: arrParamValues
	};
    return ex;
}

jsim.isArray = function(obj) {
    "use strict";
    return ( Object.prototype.toString.call(obj) === '[object Array]' );
};

// Note: returns true for array objects! returns false for null
jsim.isObjectOrArray = function(obj) {
    "use strict";
	return ( ( typeof obj !== "undefined" ) && 
	         ( obj !== null ) && 
			 ( typeof obj === "object" ) );
};

// Note: returns false for array objects! returns false for null
jsim.isObject = function(obj) {
    "use strict";
	return ( ( typeof obj !== "undefined" ) && 
	         ( obj !== null ) && 
			 ( typeof obj === "object" ) && 
			 ( !jsim.isArray(obj) ) );
};

jsim.isString = function(obj) {
    "use strict";
	return ( typeof obj === 'string' );
};

// If test is not true, throw an exception using functionName, msg, and arrInfo
jsim.assert = function(test, functionName, msg, arrInfo) {
    "use strict";
	if ( ! test ) {
        throw jsim.createException(functionName, msg, arrInfo);
	}
	return this;
};

// Does val exist within arr? If so, returns index (>= 0), else returns -1
jsim.indexOf = function(arr, val) {
    "use strict";
	var ii, len;
	if ( ( typeof arr === "undefined" ) || ( arr === null ) ) { return -1; }
    for ( ii = 0, len = arr.length; ii < len; ii += 1 ) {
        if ( arr[ii] === val) {
            return ii;
        }
    }
    return -1;
};

// Ensures obj is not undefined. Else uses assert to stop the works.
jsim.validatePossiblyNullObject = function(obj, functionName, baseMessage) {
    "use strict";
	jsim.assert(typeof obj !== "undefined", functionName, "Undefined " + baseMessage, []);
};

// Ensures obj is not undefined and non-null. Else uses assert to stop the works.
jsim.validateObject = function(obj, functionName, baseMessage) {
    "use strict";
	jsim.assert(typeof obj !== "undefined", functionName, "Undefined " + baseMessage, []);
	jsim.assert(obj !== null, functionName, "Null " + baseMessage, []);
};

// Ensures obj is not undefined, non-null, and is one of the given legal values. 
// Else uses assert to stop the works.
jsim.validateProperty = function(obj, functionName, baseMessage, legalValues) {
    "use strict";
	jsim.validateObject(obj, functionName, baseMessage);
	jsim.assert(jsim.indexOf(legalValues, obj) !== -1, functionName, 
	            "Unsupported " + baseMessage, [obj]);
};


// === Debugging / Logging ===

jsim.setDebugLevel = function(levelsMask) {
    this.debugLevel = levelsMask;
	return this;
}

jsim.logInternal = function(level, msg) {
	if ( (this.debugLevel & level) !== 0 ) {
	    console.log(msg);
	}
	return this;
};

// Use client callback to log a message
jsim.logMessage = function(msg) {
    "use strict";
	if ( this.fcnLogMessage !== null ) {
	    this.fcnLogMessage(msg);
	}
	return this;
}


// --- jsim "Covers" for accessing Steps Hash ---

jsim.getCurrentStepName = function() {
    "use strict";
	try {
	    return jsim.callStack.getCurrentStackFrame().currentStepName;
	} catch ( ex ) {
	    jsim.logInternal(jsim.LOG_INTERNAL_ERROR,
                         "getCurrentStepName: ERROR: Could not get current step name.");
		return null;
	}
};

jsim.setCurrentStepName = function(sStepName) {
    "use strict";
	if ( sStepName === "__END__" ) {
	    // Special case... there really isn't a step with this name
	    jsim.callStack.getCurrentStackFrame().currentStepName = sStepName;
	} else {
		try {
			jsim.callStack.getCurrentStackFrame().currentStepName = sStepName;
			return this;
		} catch ( ex ) {
			jsim.logInternal(jsim.LOG_INTERNAL_ERROR,
		            "setCurrentStepName: ERROR: Could not set current step name to '" +
				    sStepName + "'.");
			return null;
		}
	}
};

jsim.getCurrentLineNumber = function() {
    "use strict";
	var currentStepName, currentStep;
	try {
	    currentStepName = jsim.callStack.getCurrentStackFrame().currentStepName;
		currentStep = jsim.stepsHash.getStep(currentStepName);
		return currentStep.line;
	} catch ( ex ) {
	    jsim.logInternal(jsim.LOG_INTERNAL_ERROR,
                         "getCurrentLineNumber: ERROR: Could not get current line number.");
		return 1; // Better than nothing...
	}
};



// === Expression Stack ===

jsim.pushExpression = function(expr) {
    "use strict";
    this.exprStack.push(expr);
};

jsim.popExpression = function() {
    "use strict";
	var expr;
    expr = this.exprStack.pop();
	return expr;
};



// === Call/Return ===

// "Internal" utility function used by callFunction
jsim.assignValuesToArguments = function(arrArgumentNames, arrParameterValues) {
    "use strict";
	var hash, ii, pLen, vLen;
	hash = {};
	if ( ( typeof arrArgumentNames  !== 'undefined' ) &&
         ( arrArgumentNames  !== null ) &&
         ( typeof arrParameterValues !== 'undefined' ) && 
		 ( arrParameterValues !== null ) ) {
	    pLen = arrArgumentNames.length;
	    vLen = arrParameterValues.length;
	    if ( pLen > 0 ) {
	       for ( ii = 0; ii < pLen; ii += 1 ) {
	            hash[arrArgumentNames[ii]] = ( ii < vLen ? arrParameterValues[ii] : null );
	        }
	    }
	}
	return hash;
};

jsim.callFunction = function(sFunctionName, arrParameterValues) {
    "use strict";
	var oFunction, oStackFrame, oParameterValuesHash, sCurrentStepName, 
	    oCurrentStep, sNextStepName;
    oFunction = jsim.functionTable.getFunction(sFunctionName);
	if ( ( typeof oFunction !== 'undefined' ) && ( oFunction !== null ) ) {
		// Before we push the stack frame for the called function on the call stack, we
		// need to update the current step name for this, the calling stack frame, to 
		// be the one *after* the 'callFunction' step so when that function pops off
		// the call stack, this stack frame will be all set and ready to go at the 
		// next step after this one.
		sCurrentStepName = jsim.getCurrentStepName();
		oCurrentStep = jsim.stepsHash.getStep(sCurrentStepName);
		sNextStepName = oCurrentStep.nxt;
		jsim.setCurrentStepName(sNextStepName);
		
		// First, put the called function on the call stack without its parameterValuesHash
		oStackFrame = jsim.createStackFrame(sFunctionName, /*-->*/null/*<--*/, null);
		jsim.callStack.pushStackFrame(oStackFrame);
		
		// Second, "apply" the parameter values passed to this function's parameter names, 
		// creating an object with param=value pairs. Do this after putting the called
		// function on the call stack, so the arguments of the called function will be found
		oParameterValuesHash = jsim.assignValuesToArguments(oFunction.parameterNames, arrParameterValues);
		
		// Third, set the parameterValuesHash value of the stack frame to the one we just created
		// so it is available if/when any arguments are referenced within the function
		oStackFrame.parameterValuesHash = oParameterValuesHash;
		
		// We don't actually call the function
		
		jsim.logInternal(jsim.LOG_CALL_RETURN,
                         "Called '" + sFunctionName + "' with parameter values: " + 
						 arrParameterValues.join(", "));
	} else {
	    jsim.logInternal(jsim.LOG_INTERNAL_ERROR,
		              "jsim.callFunction: ERROR: Attempt to call an undefined function '" + 
					  sFunctionName + "'.");
	}
};

jsim.returnFromFunction = function(oReturnValue) {
    "use strict";
    var oCurrentStackFrame, oCallerStackFrame;
    oCurrentStackFrame = jsim.callStack.popStackFrame();
	// Caller is now at the top after we just popped off the current frame
	oCallerStackFrame = jsim.callStack.getCurrentStackFrame();
    // Return oReturnValue, the return value, to calling function / parent expression
	// by pushing it onto the expression stack. They can _pop it.
    jsim.pushExpression(oReturnValue);
	jsim.logInternal(jsim.LOG_CALL_RETURN,
                     "Returned from '" + oCurrentStackFrame.functionName + 
	                 "' with return value '" + oReturnValue +
	                 "' which was pushed onto the expression stack.");
};

jsim.conditional = function(expr) {
    "use strict";
	var sStepName, oStep;
	
	try {
		sStepName = jsim.getCurrentStepName();
		oStep = this.stepsHash.getStep(sStepName);

		// The protocol is that if a step returns true, flow goes to the nxt step,
		// otherwise it goes to the els step. That's exactly what we want, based
		// on the given expression.
		return expr;
	} catch ( ex ) {
	    throw jsim.createException("jsim.conditional", "Internal error", [sStepName]);
	}
};

// === Parse Tree Processing-Related ===

// Executes fcn on the object and its children (recursively)
// fcn has signature: fcn(obj, level, parent) and should return false to stop recursion
jsim.traverse = function(obj, fcn) {
    "use strict";
	var sanity = 0;

	function traverse_(obj, fcn, level, parent) {
	    var key, child, ii, len;
		
	    sanity = sanity + 1; if ( sanity > jsim.maxSanity ) { return; }
		
		if ( fcn.call(null, obj, level, parent) === false ) {
			return;
		}

		for ( key in obj ) {
		    // Prevent infinite recursion by checking that key is anything other than "jsimParent"
			if ( ( obj.hasOwnProperty(key) ) && ( key !== "jsimParent" ) ) {
				child = obj[key];
				if ( jsim.isArray(child) ) {
				    for ( ii = 0, len = child.length; ii < len; ii += 1 ) {
					    traverse_(child[ii], fcn, level + 1, obj);
					}
				} else if ( jsim.isObject(child) ) {
					traverse_(child, fcn, level + 1, obj);
				}
			}
		}
	}

	traverse_(obj, fcn, 0, null);	
};

// Executes fcn on the object and its children (recursively)
// fcn has signature: fcn(obj, level, parent) and should 
// return an integer (e.g., 0 or 1)
// Unlike traverse(), there is no way to "short-circuit"
// the recursion... the function fcn is invoked on all nodes.
// A final sum is returned to the top-most caller.
jsim.traverseWithCount = function(obj, fcn) {
    "use strict";
	var arrCount;

	function traverseWithCount_(obj, fcn, level, parent, arrCount) {
	    var key, child, ii, len, cnt;
		
		cnt = fcn.call(null, obj, level, parent);
		arrCount[0] = arrCount[0] + cnt;

		for ( key in obj ) {
		    // Prevent infinite recursion by checking that key is anything other than "jsimParent"
			if ( ( obj.hasOwnProperty(key) ) && ( key !== "jsimParent" ) ) {
				child = obj[key];
				if ( jsim.isArray(child) ) {
				    for ( ii = 0, len = child.length; ii < len; ii += 1 ) {
					    traverseWithCount_(child[ii], fcn, level + 1, obj, arrCount);
					}
				} else if ( jsim.isObject(child) ) {
					traverseWithCount_(child, fcn, level + 1, obj, arrCount);
				}
			}
		}
	}

	arrCount = [0]; // Used to simulate call by reference
	traverseWithCount_(obj, fcn, 0, null, arrCount);
    return arrCount[0];	
};

jsim.dumpNode = function(node) {
    "use strict";
	
	function traverseCallback(node, level, parent) {
		"use strict";
		console.log(jsim.repeat("    ", level), node);
		return true; // Keep going
	}
	
	jsim.traverse(node, traverseCallback);
};

jsim.findParentNodeOfType = function(node, type) {
	"use strict";
	var result;
	result = null;
	while ( true ) {
		if ( node === null ) { break; }
		if ( ! node.hasOwnProperty("type") ) { break; }
		if ( node.type === type ) { result = node; break; }
		jsim.assert(node.hasOwnProperty("jsimParent"), "jsim.findParentNodeOfType", 
					"Missing expected jsimParent property", []);
		node = node.jsimParent;
	}
	return result;
};

jsim.findParentFunctionDeclaration = function(node) {
	"use strict";
	return this.findParentNodeOfType(node, "Function");
};

// Store grammar in jsim object (grammar string using PEG syntax)
// Creates and remembers PEG parser function based on this grammar
jsim.setGrammar = function(grammar) {
    "use strict";
	try {
    	this.grammar = grammar;
	    this.tsLastGrammar = this.now();
	    this.parser = PEG.buildParser(grammar, { trackLineAndColumn:true });
	} catch ( ex ) {
	    // Somehow the grammar we were handed is invalid
		throw jsim.createException("jsim.setGrammar", "Bad grammar", []);
		console.log("jsim.setGrammar: Exception:", ex);
	}
};

// Store program source code in jsim object
jsim.setProgramSource = function(programSource) {
    "use strict";
	this.pgm = programSource;
	this.tsLastSource = this.now();
};


// === Program Execution ===

jsim.noOp = function() {
    "use strict";
	// Do nothing
};

jsim.resetProgram = function() {
    "use strict";
    this.postParseIfNecessary();
	this.callStack.clear();
	this.exprStack = [];
	this.isPaused = false;
	// Allow client to reflect that we're "back to the beginning of the program"
	if ( jsim.fcnPreStep !== null ) {
	    jsim.fcnPreStep();
	}
};

jsim.canPerformStep = function() {
    "use strict";
	var sStepName;
	sStepName = jsim.getCurrentStepName();
	return ( !(sStepName === "__END__") );
};

// Note: Pausing only affects things when running, not stepping. That is, can 
//       always step, even if paused
jsim.pause = function() {
    "use strict";
	this.isPaused = true;
	// Also need to stop the step timer, if it is running
	if ( this.stepTimer !== null ) {
        clearTimeout(this.stepTimer);
	}
};

jsim.unPause = function() {
    "use strict";
	this.isPaused = false;
	// QQQ restart timer? how do we know that we should (vs. just stepping only, never run)
};

// The heart and soul...
jsim.performStep = function() {
    "use strict";
	var sStepName, oStep, retval;
	
	try {
		jsim.logInternal(jsim.LOG_EXEC, "jsim.performStep: sStepName = " + 
		                 jsim.getCurrentStepName());
		if ( (jsim.debugLevel & jsim.LOG_EXEC) !== 0 ) {
		    jsim.callStack.dump();
		}
		
	    // Get the current step name
	    sStepName = jsim.getCurrentStepName();
		
		// Protect against running past last step of program
		if ( sStepName === "__END__" ) {
		    // No more steps -- Don't restart the timer
		    if ( jsim.fcnEndOfExecution !== null ) {
		       jsim.fcnEndOfExecution();
		    }
		    jsim.logMessage("step: ERROR: At end of program.");
			return;
		}
		
		// Get the current Step object
		oStep = this.stepsHash.getStep(sStepName);
		
		// Protect against an internal error where our step name is invalid
		if ( oStep === null ) {
		    jsim.logInternal(jsim.LOG_INTERNAL_ERRROR,
			                 "step: ERROR: Invalid step name '" + sStepName + "'.");
			// Protect against infinite loops
			jsim.setCurrentStepName("__END__"); // Force end of program
			return;
		}
		
		// Here we go...
		jsim.logInternal(jsim.LOG_EXEC, "Executing step " + sStepName + "...");
		
		// Run the JS function (except for artificial steps; even though no real 
		// harm would come if we did since these are jsim._noop() calls.
		if ( ! oStep.isSkip ) {
		    retval = oStep.fcn();
		}
		
		// Set next step. Normally this is oStep.next, but when we make a 
		// function call (and find oStep.callTo), we use this, and when we are 
		// returning from a function call (and find oStep.isReturn), we use this.
		if ( ( typeof oStep.callTo !== 'undefined' ) && ( oStep.callTo !== null ) ) {
		    // First step within a stack frame for function XXX is always XXX_0
   			jsim.setCurrentStepName(oStep.callTo + "_0"); 
		} else if ( ( typeof oStep.isReturn !== 'undefined' ) && 
		            ( oStep.isReturn !== null ) && 
					( oStep.isReturn ) ) {
		    // Now that the _return() function has been called when oStep.fcn 
			// was called above, the call stack now has the calling function on 
			// the top of the call stack. All we need to do is set the current 
			// step name to the current step name as stored in that stack frame
			// which in fact means we don't have to do anything since 
			// jsim.getCurrentStepName() will now return what the top-most
			// (calling function of the function from which we're returning) 
			// stack frame holds as its current step name
		} else if ( ( typeof retval !== 'undefined' ) && ( retval === false ) ) {
		    jsim.setCurrentStepName(oStep.els);
		} else {
			jsim.setCurrentStepName(oStep.nxt);
		}
		
		// In the case of an artificial step, we recurse so as to execute the
		// next step. For all "real" steps, we give the client a chance to update
		// its UI.
		if ( oStep.isSkip ) {
		    jsim.performStep(); // Recurse now that we've moved to the right/next step
		} else {
			// Give client UI a chance to show current line or indicate end of execution
			// Doing this here, at the end, hides the initial "artificial" step that 
			// starts things off and allows the UI to refresh, showing the current line 
			// position *before* it is executed
			if ( ( jsim.getCurrentStepName() === "__END__" ) && 
				 ( jsim.fcnEndOfExecution !== null ) ) {
				jsim.fcnEndOfExecution();
			} else if ( jsim.fcnPreStep !== null ) {
				jsim.fcnPreStep();
			}
		}
	} catch ( ex ) {
	    jsim.logInternal(jsim.LOG_INTERNAL_ERROR,
		                 "step: Exception: " + ex.message);
		throw ( ex );
	}
};

jsim.setStepDelay = function(delay) {
    "use strict";
	jsim.stepDelay = delay;
};

jsim.getStepDelay = function() {
    "use strict";
	return jsim.stepDelay;
};

jsim.speedUp = function(factor) {
    "use strict";
	jsim.stepDelay = Math.floor(jsim.stepDelay / factor);
};

jsim.slowDown = function(factor) {
    "use strict";
	jsim.stepDelay = Math.floor(factor * jsim.stepDelay);
};

jsim.performStepTimeout = function() {
    "use strict";
	jsim.sanityCount = jsim.sanityCount + 1;
	if ( jsim.sanityCount > jsim.maxSanityCount ) {
	    // Something went wrong...
		this.errorMessage("An internal error occurred. (KAR-999)");
		// Don't restart the timer
	}
    jsim.performStep();
	if ( ( jsim.canPerformStep() ) && ( ! jsim.isPaused ) ) {
	    // More steps and not paused -- Restart the timer
		jsim.stepTimer = setTimeout(function() {
		    jsim.performStepTimeout(); 
		}, jsim.stepDelay);  
	}
};

jsim.executeProgram = function() {
    "use strict";
    jsim.sanityCount = 0;
    jsim.resetProgram();
	// Perform first step immediately; the rest will happen via JS timeout
	jsim.performStepTimeout(); 
};

jsim.continueProgram = function() {
    "use strict";
	// Perform next step immediately; the rest will happen via JS timeout
	jsim.performStepTimeout(); 
};



// === Shortcuts used within generated step functions ===

jsim._noop   = jsim.noOp;
jsim._call   = jsim.callFunction;
jsim._return = jsim.returnFromFunction;
jsim._cond   = jsim.conditional;
jsim._pop    = jsim.popExpression;



// === Settrs for Client to Provide Callback Functionss ===

jsim.setPreStepCallback = function(fcn) {
    "use strict";
	this.fcnPreStep = fcn;
};

jsim.setEndOfExecutionCallback = function(fcn) {
    "use strict";
	this.fcnEndOfExecution = fcn;
};

jsim.setLogMessageCallback = function(fcn) {
    "use strict";
	this.fcnLogMessage = fcn;
};



// === Initialization ===

jsim.init = function() {
    "use strict";
	
	this.functionTable = this.createFunctionTable();
	// Note: Clearing the function table actually leaves a single "__GLOBAL__" funktion 
	//       defined in the functionTable so we can have a stack frame for it initially
    this.functionTable.clear(); 

	this.callStack = this.createCallStack();
	// Note: Clearing the call stack actually leaves a single "global" stack frame on 
	//       the call stack ("__GLOBAL__"), which represents our "starting point"/context
	this.callStack.clear(); 
	
	this.stepsHash = this.createStepsHash();
	this.stepsHash.clear();
};

window.jsim = jsim;

return jsim;

});
