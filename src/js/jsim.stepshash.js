// jsim.stepshash.js
//
// jsim is a JavaScript "simulator" that can be used within a web browser
// and that supports variable-speed program execution, stepping through
// lines of code, setting break points, etc.
//
// This file contains the jsim code related to steps and "the steps hash"
//
// NOTE: "Hash" here is really just a plain JS object that is used like a
//       hash table or associative array
//

define(
["jsim"],
function(jsim) {

// --- Steps Hash ---

jsim.StepsHash = { 
    __type__: "StepsHash"
    // hash
};

jsim.createStepsHash = function() {
    "use strict";
	var stepsHash = Object.create(jsim.StepsHash);
	stepsHash.hash = {};
	return stepsHash;
};

jsim.StepsHash.clear = function() {
	"use strict";
	this.hash = {};
	return this;
};

jsim.StepsHash.addStepO = function(sStepName, oStep) {
    "use strict";
	this.hash[sStepName] = oStep;
	return oStep;
}

jsim.StepsHash.addStepV = function(sStepName, fcn, iLineNumber, 
                                   sNextStepName, sElseStepName, 
								   sCallToFunctionName, bIsReturn,
								   bIsSkip) {
    "use strict";
	var oStep;
	oStep = jsim.createStep(sStepName, fcn, iLineNumber, 
	                        sNextStepName, sElseStepName, 
							sCallToFunctionName, bIsReturn,
							bIsSkip);
	this.addStepO(sStepName, oStep);
	return oStep;
};
    
jsim.StepsHash.getStep = function(sStepName) {
    "use strict";
	if ( this.hash.hasOwnProperty(sStepName) ) {
	    return this.hash[sStepName];
	} else {
		return null;
	}
}

jsim.StepsHash.dump = function() {
    "use strict";
	var numSteps;
	numSteps = jsim.getNumOwnProperties(this.hash);
	if ( numSteps > 0 ) {
    	jsim.logMessage("The step table contains " + numSteps + " entries:");
	    for (var sStepName in this.hash) {
            if (this.hash.hasOwnProperty(sStepName)) {
		        this.hash[sStepName].dump();
		    }
	    }
	} else {
	    jsim.logMessage("No steps in step table.");
	}
	return this;
};

// --- Step ---

jsim.Step = { 
    __type__: "Step"
    // name     : Name of the Step
	// fcn      : JS Function that implements this step
	// line     : Line number within original source code
	// nxt      : Name of the next Step to execute under normal circumstances
	// els      : Name of the next Step to execute when if expression returns false
	// callTo   : Name of function being called if Step is a _call step, else null
	// isReturn : true if Step is a _return step, else false
	// isSkip   : true if Step is an "artificial" one that should be skipped
};

jsim.createStep = function(sStepName, fcn, iLineNumber, 
                           sNextStepName, sElseStepName,
						   sCallToFunctionName, bIsReturn,
						   bIsSkip) {
    "use strict";
	var step = Object.create(jsim.Step);
	step.name     = sStepName;
	step.fcn      = fcn;
	step.line     = iLineNumber;
	step.nxt      = sNextStepName;
	step.els      = sElseStepName;
	step.callTo   = sCallToFunctionName;
	step.isReturn = bIsReturn;
	step.isSkip   = bIsSkip;
	return step;
};

jsim.Step.dump = function() {
    "use strict";
	jsim.logMessage("Step: name=" + this.name + ", fcn=" + this.fcn +
	                ", line=" + this.line + ", nxt=" + this.nxt +
					", els=" + this.els + ", callTo=" + this.callTo +
					", isReturn=" + this.isReturn + ", isSkip=" + this.isSkip);
    return this;
};

return jsim;

});
