// jsim.codegen.js
//
// jsim is a JavaScript "simulator" that can be used within a web browser
// and that supports variable-speed program execution, stepping through
// lines of code, setting break points, etc.
//
// This file contains the jsim code related to the "code generation" done
// after parsing program source using a given grammar (as defined by PEG)
// This is really "step generation" to create a "hash" of steps that
// "point to one another" (by name) and that can be run by the core jsim engine. 
//
// See jsim.postparse.js for related (invoking/"parent") post-parsing code.
//

define(
["jsim"],
function(jsim) {

// --------------- Begin Generate Expression Strings (ges) Functions ---------------

// ges -- Main Generate Expression String Function
// Internally called by various gssXXX() functions
// Builds up expression strings that:
// - are valid JavaScript expressions
// - are exactly like what a normal JavaScrip code generator would produce EXCEPT:
//   - Variable references are converted into jsim._get() calls
//     E.g., print(a) turns into print(jsim._get('a')) [for known variable names]
//   - Function calls are converted into jsim._call() calls
//     E.g., print(getNumBeepersInWorld()) turns into 
//     print(jsim._call('getNumBeepersInWorld', [], null) [for known function names]
// Should be called initially (by a gssXXX() function) with an empty arrExpr array
// QQQ in last example, how is value returned by _call saved/used by print call?!?!?!?!?!?!?!?!??!!??!??!!
jsim.ges = function(node, arrExpr) {
	"use strict";
    var typ, line, ii, len, ss, sb, oFunction, name, arrExprParams, params;
	
	if ( node === null ) {
	    arrExpr.push("null");
		return;
	}
	
	if ( jsim.isArray(node) ) {
	    arrExpr.push("[");
	    for ( ii = 0, len = node.length; ii < len; ii += 1 ) {
		    this.ges(sb, node[ii], arrExpr);
			if ( ii !== len - 1 ) { arrExpr.push(","); }
		}
		arrExpr.push("]");
		return;
	}

	typ = node.type;
	line = node.line || -1;
	
	if ( typ === "NullLiteral" ) {
		arrExpr.push("null");

	} else if ( typ === "NumericLiteral" ) {
        arrExpr.push(node.value);

	} else if ( typ === "StringLiteral" ) {
        arrExpr.push("'" + node.value + "'"); // Note the single quotes added, surrounding the string
	
	} else if ( typ === "BooleanLiteral" ) {
        arrExpr.push(node.value);
	
	// QQQ Other literals???
	
	} else if ( typ === "ParenthesizedExpression" ) {
	    this.ges(node.value, arrExpr);

	} else if ( typ === "BinaryExpression" ) {
	    this.ges(node.left, arrExpr);
		arrExpr.push(node.operator);
		this.ges(node.right, arrExpr);
		
	} else if ( typ === "UnaryExpression" ) {
	    arrExpr.push(node.operator);
	    this.ges(node.expression, arrExpr);
	
    } else if ( typ === "Variable" ) {
        arrExpr.push("jsim._get('" + node.name + "')");
	
	} else if ( typ === "AssignmentExpression" ) {
        /*
	    jsim.validateObject  (node.value.left,           "jsim.gssExpressionStatement", "value.left");
	    jsim.validateObject  (node.value.left.type,      "jsim.gssExpressionStatement", "value.left.type");
		jsim.validateObject  (node.value.right,          "jsim.gssExpressionStatement", "value.right");
		jsim.validateObject  (node.value.left.name,      "jsim.gssExpressionStatement", "value.left.name");
		jsim.validateObject  (node.value.right,          "jsim.gssExpressionStatement", "value.right");
		jsim.validateObject  (node.value.operator,       "jsim.gssExpressionStatement", "value.operator");
		jsim.validateObject  (node.value.operator,       "jsim.gssExpressionStatement", "value.operator", ["="]);
		*/
		
	} else if ( typ === "PropertyAccess" ) {
	    /*
		if ( node.value.name.type === "PropertyAccess" ) {
	        // QQQ User-defined variable??? Use _var???
	        name = node.value.name.base.name + "." + name;
	    }
	    jsim.validateObject  (node.value.name.base,      "jsim.generateExpressionStatement:PropertyAccess", "value.name.base");
	    jsim.validateProperty(node.value.name.base.type, "jsim.generateExpressionStatement:PropertyAccess", "value.name.base.type", ["Variable"]);
		jsim.validateObject  (node.value.name.base.name, "jsim.generateExpressionStatement:PropertyAccess", "value.name.base.name");
		*/
		
	} else if ( typ === "FunctionCall" ) {

		jsim.validateObject  (node.name,      "jsim.generateExpressionStatement", "name");
		jsim.validateObject  (node.name.type, "jsim.generateExpressionStatement", "name.type");
		jsim.validateProperty(node.name.type, "jsim.generateExpressionStatement", "name.type", ["Variable" /* QQQ, "PropertyAccess" */]);
		jsim.validateObject  (node.name.name, "jsim.generateExpressionStatement", "name.name");
		jsim.validateObject  (node.arguments, "jsim.generateExpressionStatement", "arguments");
	
        name = node.name.name;

		arrExprParams = [];
		this.ges(node.arguments, arrExprParams);
	    params = arrExprParams.join(" ");
		
	    // The function being called could be a "built-in" function (like "move();")
	    // or a call to a user-defined function (within the pgm body)
	    // The former is called "as-is", the latter turns into a _call()
	    oFunction = jsim.functionTable.getFunction(name);
	    if ( ( typeof oFunction === 'undefined' ) || ( oFunction === null ) ) {
		    // Call to a "built-in" function
		    ss = "jsim.stepsHash.addStepV(" + 
			     this.makeQuotedStepName(curName, curNum) + ", " +
				 "function() { " + name + 
				 "(" + params + ");" +
				 " }, " +
				 line + ", " +
				 this.makeQuotedStepName(curName, curNum + 1) + ", " +
				 this.makeQuotedStepName(null, null) + ", " + 
				 "null" + ", " +
				 "false, false);";
			sb.append(ss); sb.append("\n");
		} else {
			// Call to a user-defined function
			ss = "jsim.stepsHash.addStepV(" +
				 this.makeQuotedStepName(curName, curNum) + ", " +
				 "function() { jsim._call('" + params + "); }" + ", " +
				 line + ", " +
				 this.makeQuotedStepName(curName, curNum + 1) + ", " +
				 this.makeQuotedStepName(null, null) + ", " +
				 "'" + name + "'" + ", " +
				 "false, false);";
			sb.append(ss); sb.append("\n");
		}
	
	} else {
		// Unsupported node type
		throw jsim.createException("jsim.ges", "Unsupported expression node.type", [typ]);
	}
};

// --------------- End Generate Expression Strings (ges) Functions ---------------



// --------------- Begin Generate Step Strings (gss) Functions ---------------

// Utility function that creates single-quoted strings from a step name
// and step number (with an underscore in between)
// Given "foo" and 1, returns "'foo_1'" (note the single quote marks)
jsim.makeQuotedStepName = function(name, num) {
    "use strict";
	if ( name === null && num === null ) { return null; }
    return "'" + name + "_" + num + "'";
};

// Utility function to help artificial steps created at the end of blocks
// figure out where to go next. This is complicated because if the step
// is the last statement of the block, the next step is the next appropriate
// step in an ancestor block "above"/outside of this block, *and* that
// statement could also be the last step in that block, etc.
// This is actually handled by creating artificial steps at the end of
// any/all blocks (if, else, while, do while, etc.) so that the last
// step in any given block can always find a "next" step in the parent
// block.
//
// Examples:
//    foo_3_T_5_F_4_T_6 should go to foo_3_T_5_F_4 next
//    foo_3_T_5_F_4     should go to foo_3_T_5 next
//    foo_3_T_5         should go to foo_4 next
//
// Note that a step name of "foo_3_T_5_F_4" is represented as a parameter
// value for curName of "foo_3_T_5_F" and a parameter value for curNum
// of "4". That is, the last "_" and concatenation is implied in a sense.
// Because of this and the fact that we'd be chopping off the last numeric
// value any way, curNum is unused.

jsim.getLastStepInfo = function(curName, curNum) {
    "use strict";
	var info, undLast, undSecondFromLast;
	info = {};
	undLast = curName.lastIndexOf("_");
	if ( undLast === -1 ) {
	    // E.g., curName="foo", curNum=3 => ("foo", 4)
		info.name = curName;
		info.num  = curNum + 1;
	} else {
    	undSecondFromLast = curName.lastIndexOf("_", undLast - 1);
	    info.name = curName.substring(0, undSecondFromLast);
	    info.num  = parseInt(curName.substring(undSecondFromLast+1, undLast)) + 1;
	}
	return info;
};

// gssFunction -- Generate Steps Strings for Function node
jsim.gssFunction = function(sb, node, curName, curNum) {
	"use strict";
    var line, ss, ii, len, lastLine;
	
	line = node.line || -1;
	
	// "Landing" step for function... No op.
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(node.name, 0) +
		 ", function() { jsim._noop(); }, " +
		 line + ", " +
		 this.makeQuotedStepName(node.name, 1) + ", " +
		 this.makeQuotedStepName(null, null) + ", " + 
		 "null" + ", " +
		 "false, false);";
	sb.append(ss); sb.append("\n");
	
	// Body of function
	for ( ii = 0, len = node.elements.length; ii < len; ii += 1 ) {
		this.gss(sb, node.elements[ii], node.name, ii + 1);
	}
	
	// Implicit "return" from the function, after all body steps
    lastLine = line; // TODO: Wish we had something better!
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(node.name, node.elements.length + 1) + ", " +
		 "function() { jsim._return(null); }, " +
		 lastLine + ", " +
		 this.makeQuotedStepName(null, null) + ", " + 
		 this.makeQuotedStepName(null, null) + ", " + 
		 "null" + ", " + 
		 "true, false);";
	sb.append(ss); sb.append("\n");
};

// gssReturnStatement -- Generate Steps String for ReturnStatement node
jsim.gssReturnStatement = function(sb, node, curName, curNum) {
	"use strict";
    var ss, line, arrExpr, expr;
	
	line = node.line || -1;
	
	jsim.validatePossiblyNullObject(node.value, "jsim.gssReturnStatement", "value");
	
    // Generate expression for return value
	arrExpr = [];
	this.ges(node.value, arrExpr);
	expr = arrExpr.join(" ");
	
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 "function() { jsim._return(" + expr + "); }, " +
		 line + ", " +
		 this.makeQuotedStepName(null, null) + ", " + 
		 this.makeQuotedStepName(null, null) + ", " + 
		 "null" + ", " + 
		 "true, false);";
	sb.append(ss); sb.append("\n");
};

// gssVariableStatement -- Generate Steps Strings for VariableStatement node
jsim.gssVariableStatement = function(sb, node, curName, curNum) {
    "use strict";
	var ss, line, decls, ii, len, stepName, stepNum, nxtName, nxtNum, lastStepInfo, arrExpr, initVal;
	
	line = node.line || -1;
	
	decls = node.declarations;
	jsim.validateObject(decls, "jsim.gssVariableStatement", "declarations");
	this.assert(decls.length > 0, "jsim.gssVariableStatement", "Empty declarations", []);
	
	for ( ii = 0, len = decls.length; ii < len; ii += 1 ) {
		this.validateProperty(decls[ii].type, "jsim.gssVariableStatement", "declarations[].type", ["VariableDeclaration"]);
		this.validateObject  (decls[ii].name, "jsim.gssVariableStatement", "declarations[].name");
		this.validatePossiblyNullObject(decls[ii].value, "jsim.gssVariableStatement", "declarations[].value");
		
		// Generate expression for initial value
	    arrExpr = [];
	    this.ges(decls[ii].value, arrExpr);
	    initVal = arrExpr.join(" ");
		
		if ( ii === 0 ) {
		    // First var decl is step named <curName>_<curNum>
		    stepName = curName;
			stepNum  = curNum;
        } else {
		    // All other var decls are named <curName>_<curNum>_<ii>
			stepName = curName + "_" + curNum;
			stepNum  = ii;
		}
		
		if ( ii === len - 1 ) {
		    // Last var decl has nxt step <curName>_<curNum+1>
			nxtName = curName;
			nxtNum  = curNum + 1;
		} else {
		    // All other var decls have nxt steps of <curName>_<curNum>_<ii+1>
			nxtName  = curName + "_" + curNum;
			nxtNum   = ii + 1;
		}

		ss = "jsim.stepsHash.addStepV(" +
		     this.makeQuotedStepName(stepName, stepNum) + ", " +
		     "function() { jsim._var('" + decls[ii].name + "', " + initVal + "); }, " +
		     line + ", " +
		     this.makeQuotedStepName(nxtName, nxtNum) + ", " + 
		     this.makeQuotedStepName(null, null) + ", " + 
		     "null" + ", " + 
		     "false, false);";
		sb.append(ss); sb.append("\n");
	}
	
	// "Artificial" step at very end of variable declarations block
	lastStepInfo = this.getLastStepInfo(curName, curNum);
    nxtName  = lastStepInfo.name;
    nxtNum   = lastStepInfo.num;
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName + "_" + curNum, (len+1)) + ", " +
		 "function() { jsim._noop(); }, " +
		 line + ", " +
		 this.makeQuotedStepName(nxtName, nxtNum + 1) + ", " +
		 "null" + ", " +
		 "null" + ", " +
		 "false, true);";
	sb.append(ss); sb.append("\n");
};

// gssExpressionStatement -- Generate Steps Strings for ExpressionStatement node
// Examples:
//     a = 17;
//     alert('foo');
//     my_karel_func('foo');
//     console.log('foo');
jsim.gssExpressionStatement = function(sb, node, curName, curNum) {
    "use strict";
	var line, arrExpr, val, ss;
	
	line = node.line || -1;
	
	this.validateObject(node.value, "jsim.gssExpressionStatement", "value");
	
	// Generate expression for value
	arrExpr = [];
	this.ges(node.value, arrExpr);
	val = arrExpr.join(" ");

	if ( ( ( typeof node.value.left === "undefined" ) ||
	       ( node.value.left === null ) ) ) {
        // No left hand side given... Make one up!
		lhs = "___DUMMY999___";
	} else {
	    // NOTE: Currently, only legal to do lhs = rhs (= only)
	    this.validateObject  (node.value.left.name, "jsim.gssExpressionStatement", "value.left.name");
		this.validateObject  (node.value.operator,  "jsim.gssExpressionStatement", "value.operator");
		this.validateProperty(node.value.operator,  "jsim.gssExpressionStatement", "value.operator", ["="]);
	    lhs = node.value.left.name;
	}
	ss = "jsim.stepsHash.addStepV(" + 
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 "function() { jsim._set('" + 
		 node.value.left.name +
		 "', " +
		 val +
		 ");" +
		 " }, " +
		 line + ", " +
		 this.makeQuotedStepName(curName, curNum + 1) + ", " +
		 this.makeQuotedStepName(null, null) + ", " + 
		 "null" + ", " +
		 "false, false);";
	sb.append(ss); sb.append("\n");
};

// gssIfStatement -- Generate Steps Strings for IfStatement node
//
// if (cond) {                  step f_n    : _cond      (nxt: f_n_T_1, els: f_m)
//   stmt1              ==>     step f_n_T_1: stmt1      (nxt: f_n_T_2, els: -)
//   stmt2                      step f_n_T_2: stmt2      (nxt: f_n_T_3, els: -)
//   stmt3                      step f_n_T_3: stmt3      (nxt: f_n_T_4, els: -)
// }                            step f_n_T_4: _skip      (nxt: *UP*   , els: -)        [artificial]
//
//
// if (cond) {                  step f_n    : _cond      (nxt: f_n_T_1, els: f_n_f_1)
//   stmt1              ==>     step f_n_T_1: stmt1      (nxt: f_n_T_2, els: -)
//   stmt2                      step f_n_T_2: stmt2      (nxt: f_n_T_3, els: -)
//   stmt3                      step f_n_T_3: stmt3      (nxt: f_n_T_4, els: -)
// } else {                     step f_n_T_4: _skip      (nxt: *UP*   , els: -)        [artificial]
//   stmt4                      step f_n_F_1: stmt4      (nxt: f_n_F_2, els: -)
//   stmt5                      step f_n_F_2: stmt5      (nxt: f_n_F_3, els: -)
// }                            step f_n_F_3: _skip      (nxt: *UP*   , els: -)        [artificial]
//
jsim.gssIfStatement = function(sb, node, curName, curNum) {
    "use strict";
	var ss, line, cond, ifn, elsn, ifLen, elsLen, ii, 
	    condIfName, condIfNum, condElsName, condElsNum, nxtName, nxtNum, lastStepInfo,
		arrExpr, expr;
	
	line = node.line || -1;
	
	cond = node.condition;       // condition sub Node
	ifn  = node.ifStatement;     // ifStatement sub Node
	elsn = node.elseStatement;   // elseStatement sub Node

	// Conditional step, which will determine where we go after evaluating the
	// condition. Here are the possible cases:
	//     1. if no else with no stmts in if block (unusual)
	//     2. if no else with >= 1 stmts in if block (normal if without else)
	//     3. if..else with no stmts in either block (unusual)
	//     4. if..else with >= 1 stmts in if block but no stmts in else block (unusual)
	//     5. if..else with no stmts in if block but >= 1 stmts in else block (unusual)
	//     6. if..else with >= 1 stmts in both blocks (normal if with else)
	// Logic:
	// - If if block has >= 1 statement and condition is true, go into if block
	// - If else block has >= 1 statement and condition is false, go into else block
	// - Otherwise go to artificial step within if or else respectively
	
	if ( ifn.type === "Block" ) {
    	if  ( ( typeof ifn.statements === "undefined" ) ||
		      ( ifn.statements === null ) ||
		      ( ifn.statements.length === 0 ) ) {
		    ifLen = 0;
	    } else {
		    ifLen = ifn.statements.length;
	    }
	} else {
	    ifLen = 1;
	}
	
	if ( elsn.type === "Block" ) {
	    if  ( ( typeof elsn.statements === "undefined" ) ||
		      ( elsn.statements === null ) ||
		      ( elsn.statements.length === 0 ) ) {
	        elsLen = 0;
	    } else {
	        elsLen = elsn.statements.length;
	    }
	} else {
	    elsLen = 1;
	}
	
	// Generate expression for do-while condition
	arrExpr = [];
	this.ges(cond, arrExpr);
	expr = arrExpr.join(" ");
	
	// If the if condition is true, go to <curName>_<curNum>_T_1
	// Normally, this will be the first real step within the if block
	// or the single statement for the if "block".
	// In the strange case where the if block is empty, this step
	// will actually be the artificially created last step of the 
	// if block.
	condIfName = curName + "_" + curNum + "_T";
	condIfNum  = 1;
	
	// If the if condition is false, go to <curName>_<curNum>_F_1
	// Normally, this will be the first real step within the else block
	// or the single statement for the else "block" (including the
	// case of a single if statement as part of an else-if).
	// In the case where there is no else block or statement or
	// in the strange case where the else block is empty, this step
	// will actually be the artificially created last step of the
    // else block.	
	condElsName = curName + "_" + curNum + "_F";
	condElsNum  = 1;
	
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 "function() { return jsim._cond(" + expr + "); }, " +
		 line + ", " +
		 this.makeQuotedStepName(condIfName, condIfNum) + ", " +
		 this.makeQuotedStepName(condElsName, condElsNum) + ", " +
		 "null" + ", " +
		 "false, false);";
	sb.append(ss); sb.append("\n");		
	
	// Body of the "if" part of the if statement
	if ( ifn.type === "Block" ) {
	    jsim.validateObject(ifn.statements, "jsim.gssIfStatement", "ifStatements.statements");
		// Body of if portion of if statement is a Block... emit steps for
		// each statement in the block
		for ( ii = 0; ii < ifLen; ii += 1 ) {
            // All steps are named <curName>_<curNum>_T_<n> and their nxt values
			// are all <curName>_<curNum>_T_<n+1>. Note that in the case of the
			// last real step, the next step is the artificially created step
			// at the end of the if block
			this.gss(sb, ifn.statements[ii],
					 curName + "_" + curNum + "_T", ii+1);
		}
	} else {
	    // Body of if portion of if statement is a single statement
		// It will be named <curName>_<curNum>_T_1 and its nxt value
		// will be <curName>_<curNum>_T_2, which will be the artificially
		// created step at the end of the if block
		this.gss(sb, ifn,
				 curName + "_" + curNum + "_T", 1);
	}

	// "Artificial" step at very end of if block
	// It will be named <curName>_<curNum>_T_<ifLen+1> and its nxt value
	// will be the "last step of the containing block"
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName + "_" + curNum + "_T", (ifLen+1)) + ", " +
		 "function() { jsim._noop(); }, " +
		 line + ", " +
		 this.makeQuotedStepName(curName, (curNum+1)) + ", " +
		 "null" + ", " +
		 "null" + ", " +
		 "false, true);";
	sb.append(ss); sb.append("\n");

	// Body of the "else" part of the if statement, if present
	if ( ( typeof elsn !== "undefined" ) && ( elsn !== null ) ) {
	    this.validateObject(elsn.type, "jsim.gssIfStatement", "elseStatement.type");
		// A real elseStatement exists
		if ( elsn.type === "Block" ) {
		    this.validateObject(elsn.statements, "jsim.gssIfStatement", "elseStatement.statements");
			// Body of else portion of if statement is a Block... emit steps for each statement in the block
			for ( ii = 0; ii < elsLen; ii += 1 ) {
                // All steps are named <curName>_<curNum>_F_<n> and their nxt values
			    // are all <curName>_<curNum>_F_<n+1>. Note that in the case of the
			    // last real step, the next step is the artificially created step
			    // at the end of the else block
			    this.gss(sb, elsn.statements[ii],
					     curName + "_" + curNum + "_F", ii+1);
			}
		} else if ( elsn.type === "IfStatement" ) {
			// Body of else portion of if statement is another if; i.e., if..else if..
		    // It will be named <curName>_<curNum>_F_1 and its nxt value
		    // will be <curName>_<curNum>_F_2, which will be the artificially
		    // created step at the end of the else block
		    this.gss(sb, elsn,
				     curName + "_" + curNum + "_F", 1);
		} else {
			// Body of else portion of if statement is a single statement (non-if)
		    // It will be named <curName>_<curNum>_F_1 and its nxt value
		    // will be <curName>_<curNum>_F_2, which will be the artificially
		    // created step at the end of the else block
		    this.gss(sb, elsn,
				     curName + "_" + curNum + "_F", 1);
        }
		
		// "Artificial" step at very end of else block
		// It will be named <curName>_<curNum>_F_<elsLen+1> and its nxt value
	    // will be the "last step of the containing block"
	    ss = "jsim.stepsHash.addStepV(" +
		     this.makeQuotedStepName(curName + "_" + curNum + "_F", (elsLen+1)) + ", " +
		     "function() { jsim._noop(); }, " +
		     line + ", " +
			 this.makeQuotedStepName(curName, (curNum+1)) + ", " +
		     "null" + ", " +
		     "null" + ", " +
		     "false, true);";
	    sb.append(ss); sb.append("\n");
	}
};

// gssWhileStatement -- Generate Steps Strings for WhileStatement node
//
// while (cond) {               step f_n    : _cond      (nxt: f_n_W_1, els: f_m)
//   stmt1              ==>     step f_n_W_1: stmt1      (nxt: f_n_W_2, els: -)
//   stmt2                      step f_n_W_2: stmt2      (nxt: f_n_W_3, els: -)
//   stmt3                      step f_n_W_3: stmt3      (nxt: f_n_W_4, els: -)
// }                            step f_n_W_4: _skip      (nxt: f_n    , els: -)  [artificial]
//                              step f_n_W_5: _skip      (nxt: *UP*, els: -)     [artificial]
//
jsim.gssWhileStatement = function(sb, node, curName, curNum) {
	"use strict";
	var ss, line, cond, stmt, ii, len, nxtName, nxtNum, lastStepInfo, arrExpr, expr;
	
	line = node.line || -1;
	
	cond = node.condition;       // condition sub Node
	stmt = node.statement;       // statement sub Node
	
	jsim.validateObject  (cond,           "jsim.gssWhileStatement", "condition");
	jsim.validateProperty(cond.type,      "jsim.gssWhileStatement", "condition.type", ["FunctionCall"]);
	jsim.validateObject  (cond.name,      "jsim.gssWhileStatement", "condition.name");
	jsim.validateProperty(cond.name.type, "jsim.gssWhileStatement", "condition.name.type", ["Variable"]);
	jsim.validateObject  (cond.name.name, "jsim.gssWhileStatement", "condition.name.name");
	jsim.validateObject  (cond.arguments, "jsim.gssWhileStatement", "condition.arguments");
	jsim.validateObject  (stmt,           "jsim.gssWhileStatement", "statement");
	jsim.validateObject  (stmt.type,      "jsim.gssWhileStatement", "statement.type");
	
	// How many statements, if any, are inside the while loop?
	if ( stmt.type === "Block" ) {
	    if ( ( typeof stmt.statements === "undefined" ) || ( stmt.statements === null ) ) {
		    len = 0;
		} else {
		    len = stmt.statements.length;
		}
	} else {
	    len = 1;
	}
	
	// Generate expression for while condition
	arrExpr = [];
	this.ges(cond, arrExpr);
	expr = arrExpr.join(" ");
	
	// Condition step, which will determine whether we go "into" the while loop
	// or whether we go to the statement just after the while loop ends
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 "function() { return jsim._cond(" + expr + "); }, " + 
		 line + ", " +
		 this.makeQuotedStepName(curName + "_" + curNum + "_W", 1) + ", " +
		 this.makeQuotedStepName(curName, (curNum+1)) + ", " +
		 "null" + ", " +
		 "false, false);";
	sb.append(ss); sb.append("\n");

	// Body step(s)
	if ( stmt.type === "Block" ) {
		// Body of while loop is a Block... emit steps for each statement in the block
		this.validateObject(stmt.statements, "jsim.gssWhileStatement", "statement.statements");
		for ( ii = 0; ii < len; ii += 1 ) {
			// To keep gss simple, all steps, including the last one, go to the next
			// step. Then we add an artificial step that goes back up to the condition
			this.gss(sb, stmt.statements[ii], 
			         curName + "_" + curNum + "_W", ii+1);
		}
	} else {
		// Body of while loop is a single statement of some kind
		this.gss(sb, stmt.statements[ii], 
			     curName + "_" + curNum + "_W", 1);
	}
	
	// "Artificial" step at very end of while block that goes back up to condition.
	// It will be named <curName>_<curNum>_<elsLen+1> and its nxt value
	// will be the step that contains the condition
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName + "_" + curNum + "_W", (len+1)) + ", " +
		 "function() { jsim._noop(); }, " +
		 line + ", " +
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 "null" + ", " +
		 "null" + ", " +
		 "false, true);";
	sb.append(ss); sb.append("\n");
	
	// Another "Artificial" step at very end of while block that will
	// provide a return point for any sub-block that's at the end of this
	// while block.
	// It will be named <curName>_<curNum>_<elsLen+2> and its nxt value
	// will be the "last step of the containing block"
	lastStepInfo = this.getLastStepInfo(curName, curNum);
	nxtName  = lastStepInfo.name;
	nxtNum   = lastStepInfo.num;
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName + "_" + curNum + "_W", (len+2)) + ", " +
		 "function() { jsim._noop(); }, " +
		 line + ", " +
		 this.makeQuotedStepName(nxtName, nxtNum) + ", " +
		 "null" + ", " +
		 "null" + ", " +
		 "false, true);";
	sb.append(ss); sb.append("\n");
};

// gssDoWhileStatement -- Generate Steps Strings for DoWhileStatement node
//
// do {                         step f_n    : _skip      (nxt: f_n_D_1, els: -)    [artificial]
//   stmt1              ==>     step f_n_D_1: stmt1      (nxt: f_n_D_2, els: -)
//   stmt2                      step f_n_D_2: stmt2      (nxt: f_n_D_3, els: -)
//   stmt3                      step f_n_D_3: stmt3      (nxt: f_n_D_4, els: -)
// } while (cond)               step f_n_D_4: _cond      (nxt: f_n_D_1, els: f_m)
//                              step f_n_D_5: _skip      (nxt: *UP* , els: -)      [artificial]
//
jsim.gssDoWhileStatement = function(sb, node, curName, curNum) {
	"use strict";
	var ss, line, cond, stmt, ii, len, nxtName, nxtNum, lastStepInfo, arrExpr, expr;
	
	line = node.line || -1;
	
	cond = node.condition;       // condition sub Node
	stmt = node.statement;       // statement sub Node
	
	jsim.validateObject  (cond,           "jsim.gssDoWhileStatement", "condition");
	jsim.validateProperty(cond.type,      "jsim.gssDoWhileStatement", "condition.type", ["FunctionCall"]);
	jsim.validateObject  (cond.name,      "jsim.gssDoWhileStatement", "condition.name");
	jsim.validateProperty(cond.name.type, "jsim.gssDoWhileStatement", "condition.name.type", ["Variable"]);
	jsim.validateObject  (cond.name.name, "jsim.gssDoWhileStatement", "condition.name.name");
	jsim.validateObject  (cond.arguments, "jsim.gssDoWhileStatement", "condition.arguments");
	jsim.validateObject  (stmt,           "jsim.gssDoWhileStatement", "statement");
	jsim.validateObject  (stmt.type,      "jsim.gssDoWhileStatement", "statement.type");
	
	// How many statements, if any, are inside the do-while loop?
	if ( stmt.type === "Block" ) {
	    if ( ( typeof stmt.statements === "undefined" ) || ( stmt.statements === null ) ) {
		    len = 0;
		} else {
		    len = stmt.statements.length;
		}
	} else {
	    len = 1;
	}
	
	// Generate expression for do-while condition
	arrExpr = [];
	this.ges(cond, arrExpr);
	expr = arrExpr.join(" ");
	
	// "Artificial" step at very top of do while
	// It will be named <curName>_<curNum> and its nxt value will be
	// <curName>_<curNum>_D_1 the containing block"
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 "function() { jsim._noop(); }, " +
		 line + ", " +
		 this.makeQuotedStepName(curName + "_" + curNum + "_D", 1) + ", " +
		 "null" + ", " +
		 "null" + ", " +
		 "false, true);";
	sb.append(ss); sb.append("\n");
	
	// Body step(s)
	if ( stmt.type === "Block" ) {
		// Body of do loop is a Block... emit steps for each statement in the block
		this.validateObject(stmt.statements, "jsim.gssDoWhileStatement", "statement.statements");
		for ( ii = 0; ii < len; ii += 1 ) {
		    // To keep gss simple, all steps, including the first one, go to the next
			// step. That's why we add the first step manually above (we need the very first
			// step to be <curName>_<curNum>, but we need its nxt to be <curName>_<curNum>,
			// which doesn't follow the normal +1 pattern.
			this.gss(sb, stmt.statements[ii], 
			         curName + "_" + curNum + "_D", ii+1);
		}
	} else {
	    // Body of do loop is a single Statement of some kind {
	    this.gss(sb, stmt,
			 curName + "_" + curNum + "_D", 1);
	}
	
	// Condition step, which will determine whether we go back to the top of the do loop
	// or whether we go to the statement just after the do loop ends
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName + "_" + curNum + "_D", (len+1)) + ", " +
		 "function() { return jsim._cond(" + expr + "); }, " +
		 line + ", " +
		 this.makeQuotedStepName(curName + "_" + curNum + "_D", 1) + ", " +
		 this.makeQuotedStepName(curName, (len+1)) + ", " +
		 "null" + ", " +
		 "false, false);";
	sb.append(ss); sb.append("\n");
	
	// "Artificial" step at very end of do while block that will provide
	// a return point for any sub-block that's at the end of this do block.
	lastStepInfo = this.getLastStepInfo(curName, curNum);
	nxtName  = lastStepInfo.name;
	nxtNum   = lastStepInfo.num;
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName + "_" + curNum + "_D", (len+2)) + ", " +
		 "function() { jsim._noop(); }, " +
		 line + ", " +
		 this.makeQuotedStepName(nxtName, nxtNum) + ", " +
		 "null" + ", " +
		 "null" + ", " +
		 "false, true);";
	sb.append(ss); sb.append("\n");
	
};

// gssEmptyStatement -- Generate Steps String for EmptyStatement node
jsim.gssEmptyStatement = function(sb, node, curName, curNum) {
	"use strict";
	var line, ss;
	
	line = node.line || -1;
	
    ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName, curNum) +
		 ", function() { jsim._noop(); }, " +
		 line + ", " +
		 this.makeQuotedStepName(curName, (curNum+1)) + ", " +
		 this.makeQuotedStepName(null, null) + ", " + 
		 "null" + ", " +
		 "false, false);";
	    sb.append(ss); sb.append("\n");
};
		
// gss -- Main Generate Steps String Function
// Internally called by generateSteps()
// Builds up "code" (in the form of a string), which will get "executed"
// so as to create real jsim Step objects, which can then be simulated.
jsim.gss = function(sb, node, curName, curNum) {
	"use strict";
    var typ, line, ss, ii, len;
	
	if ( jsim.isArray(node) ) {
	    for ( ii = 0, len = node.length; ii < len; ii += 1 ) {
		    this.gss(sb, node[ii], curName, curNum+ii);
		}
		return;
	}

	typ = node.type;
	line = node.line || -1;
	
	if ( typ === "Program" ) {
		this.gss(sb, node.elements, curName, curNum);

	} else if ( typ === "Function" ) {
        this.gssFunction(sb, node, curName, curNum);

	} else if ( typ === "ReturnStatement" ) {
        this.gssReturnStatement(sb, node, curName, curNum);
	
	} else if ( typ === "VariableStatement" ) {
        this.gssVariableStatement(sb, node, curName, curNum);
	
	} else if ( typ === "ExpressionStatement" ) {
		this.gssExpressionStatement(sb, node, curName, curNum);
																
	} else if ( typ === "IfStatement" ) {
        this.gssIfStatement(sb, node, curName, curNum);
			
	} else if ( typ === "WhileStatement" ) {
        this.gssWhileStatement(sb, node, curName, curNum);
		
	} else if ( typ === "DoWhileStatement" ) {
        this.gssDoWhileStatement(sb, node, curName, curNum);
								 
	} else if ( typ === "ForStatement" ) {	
	    throw jsim.createException("jsim.gss", "For statements not currently supported.", []);
	} else if ( typ === "ForInStatement" ) {
	    throw jsim.createException("jsim.gss", "For-in statements not currently supported.", []);
	} else if ( typ === "SwitchStatement" ) {
	    throw jsim.createException("jsim.gss", "Switch statements not currently supported.", []);
	} else if ( typ === "BreakStatement" ) {
	    throw jsim.createException("jsim.gss", "Break statements not currently supported.", []);
	} else if ( typ === "ContinueStatement" ) {
	    throw jsim.createException("jsim.gss", "Continue statements not currently supported.", []);
	} else if ( typ === "TryStatement" ) {
	    throw jsim.createException("jsim.gss", "Try statements not currently supported.", []);
	} else if ( typ === "ThrowStatement" ) {
	    throw jsim.createException("jsim.gss", "Throw statements not currently supported.", []);
		
	} else if ( typ === "EmptyStatement" ) {
	    this.gssEmptyStatement(sb, node, curName, curNum);
		
	} else if ( typ === "WithStatement" ) {
	    throw jsim.createException("jsim.gss", "With statements not currently supported.", []);
	} else if ( typ === "LabelledStatement" ) {
	    throw jsim.createException("jsim.gss", "Labelled statements not currently supported.", []);
	} else if ( typ === "DebuggerStatement" ) {
	    throw jsim.createException("jsim.gss", "Debugger statements not currently supported.", []);
	} else if ( typ === "FunctionDeclaration" ) {
	    throw jsim.createException("jsim.gss", "Function Declarations not currently supported.", []);
	} else if ( typ === "FunctionExpression" ) {
	    throw jsim.createException("jsim.gss", "Function Expressions not currently supported.", []);
  
	} else {
		// Unsupported node type
		throw jsim.createException("jsim.gss", "Unsupported node.type", [typ]);
	}
};

// --------------- End Generate Step Strings (gss) Functions ---------------

// Fill our stepsHash object with a set of steps that "point to each other" (by name)
// which, taken together, can be used to simulate the original program
// "Internal" to jsim.postParseIfNecessary()
jsim.generateSteps = function() {
    "use strict";
	var sb, cod;
	
    // Start fresh
	this.stepsHash.clear();
	
	// Add our "top-level" starter step
	this.stepsHash.addStepV("__GLOBAL__" + "_0", 
	                        function() { jsim._call("main", [], null); },
							0,
							"__END__",
							null,
							"main",
							false,
							false);
									 
	// Create string that holds 'code' that add steps to stepsHash 
	// based on this.syntax, the syntax tree, for the current program
	sb = new jsim.StringBuilder();
	this.gss(sb, this.syntax, "", 0);
	cod = sb.toString();
	
    console.log("\nGenerated Code");	
	console.log(cod);
	// Actually run this generated code... this will populate stepsHash with Steps
	jsim.runFunction(cod);
};

return jsim;

});
