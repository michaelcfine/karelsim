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

// Utility function that determines whether the node given represents
// a user-defined function name or a built-in function name (or obj.prop)
// NOTE: Assumes called for appropriate node types (Variable or PropertyAccess)
jsim.isUserFunction = function(node) {
    "use strict";
	var isUserFunction, name, oFunction;
	isUserFunction = false;
	name = "__DUMMY__";
	if ( node.name.type === "Variable" ) {
		name = node.name.name;
		oFunction = jsim.functionTable.getFunction(name);
		if ( oFunction !== null ) {
			isUserFunction = true;
		}
	}
	return isUserFunction;
};

// Utility function that determines whether the name given represents
// a user-defined variable or a built-in one
jsim.isUserVariable = function(varName) {
    "use strict";
	var isUserVariable;
	return this.isVariable(varName);
};
		
// ges -- Main Generate Expression String Function
// Internally called by various gssXXX() functions
// Builds up expression strings that:
// - are valid JavaScript expressions
// - are exactly like what a normal JavaScrip code generator would produce EXCEPT:
//   - Variable references are converted into jsim._get() calls
//     E.g., print(a) turns into: [for user-defined variable names]
//         print(jsim._get('a'))
//   - Function calls are converted into jsim._call() calls
//     E.g., print(getNumBeepersInWorld()) turns into: [for user-defined function names]
//         step n:     jsim._call('getNumBeepersInWorld', [])) 
//         step n_C_1: print(jsim.getLastReturnedValue());
//     E.g., print(mul(add(1,2), add(3,4)) turns into:
//         step n: jsim._call('add', [1,2]));
//         jsim._push(jsim._call('add', [3,4]));
//         jsim._push(jsim._call(jsim._pop(), jsim._pop()));
//         print(jsim._pop());
//
// Should be called initially (by a gssXXX() function) with an empty arrExpr array
// and the curName and curNum values for the current step and zero for subNum
//
// The curName, curNum, and subNum parameters exist because, for user-defined
// functions that return values that are used, this ges() function must
// create _call steps for those functions.

jsim.ges = function(node, arrExpr, curName, curNum, subNum, sb) {
	"use strict";
    var typ, line, ii, len, ss, oFunction, name,
        arrExprArgs, args,
	    arrExprLeft, left, arrExprRight, right;
	
	if ( node === null ) {
	    arrExpr.push("null");
		return;
	}
	
	if ( jsim.isArray(node) ) {
	    // NOTE: Expectation is that caller also knows its an array
		//       and pushed something like a "[" or "(" here
	    for ( ii = 0, len = node.length; ii < len; ii += 1 ) {
		    this.ges(node[ii], arrExpr, curName, curNum, subNum, sb);
			if ( ii !== len - 1 ) { arrExpr.push(","); }
		}
		// NOTE: Expectation is that caller also knows its an array
		//       and pushed something like a "]" or ")" here
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
	
	} else if ( typ === "RegularExpressionLiteral" ) {
	    throw jsim.createException("jsim.ges", "Regular expression literals not currently supported.", [node]); 
	
	} else if ( typ === "ObjectLiteral" ) {
	    throw jsim.createException("jsim.ges", "Object literals not currently supported.", [node]);
		
	} else if ( typ === "ArrayLiteral" ) {
        throw jsim.createException("jsim.ges", "Array literals not currently supported.", [node]); 
	
	} else if ( typ === "ParenthesizedExpression" ) {
	    this.ges(node.value, arrExpr, curName, curNum, subNum, sb);

	} else if ( typ === "BinaryExpression" ) {
	    this.ges(node.left, arrExpr, curName, curNum, subNum, sb);
		arrExpr.push(node.operator);
		this.ges(node.right, arrExpr, curName, curNum, subNum, sb);
		
	} else if ( typ === "UnaryExpression" ) {
	    arrExpr.push(node.operator);
	    this.ges(node.expression, arrExpr, curName, curNum, subNum, sb);
	
    } else if ( typ === "Variable" ) {
	    if ( this.isUserVariable(node.name) ) {
		    // A "user-defined" variable
            arrExpr.push("jsim._get('" + node.name + "')");
	    } else {
		    // A "built-in" variable like console or window
		    arrExpr.push(node.name);
		}
		
	} else if ( typ === "AssignmentExpression" ) {
	    jsim.validateObject  (node.left,           "jsim.gssExpressionStatement", "left");
	    jsim.validateObject  (node.left.type,      "jsim.gssExpressionStatement", "left.type");
		jsim.validateObject  (node.right,          "jsim.gssExpressionStatement", "right");
		jsim.validateObject  (node.left.name,      "jsim.gssExpressionStatement", "left.name");
		jsim.validateObject  (node.right,          "jsim.gssExpressionStatement", "right");
		jsim.validateObject  (node.right.type,     "jsim.gssExpressionStatement", "right.type");
		jsim.validateObject  (node.operator,       "jsim.gssExpressionStatement", "operator");
		//QQQ jsim.validateObject  (node.operator,       "jsim.gssExpressionStatement", "operator", ["="]);  // QQQ handled in gss???
		
		// Four cases:
		//     userDefinedVar = userDefinedFunc(params)     a = foo();
		//     userDefinedVar = non-userDefinedFunc         a = alert('hi');, a = 1+2;
		//     builtinVar     = userDefinedFunc(params)     window.doc.title = foo('hi');
		//     builtinVar     = non-userDefinedFunc         window.doc.title = alert('hi'); or = 1+2;

		// Generate expression array for right side
		// NOTE: This might have the 'side effect' of creating steps for user-defined functions
		arrExprRight = [];
		this.ges(node.right, arrExprRight, curName, curNum, subNum, sb);

	    if ( ( node.right.type === "FunctionCall" ) &&
             ( this.isUserFunction(node.right) ) ) {
			// Right side is a user-defined function call.
			// E.g., uservar = foo(17); or builtinvar = foo(17);
			// In this case, the _return from the function will
			// push the return value onto the expression stack
			// We just want to pop it off.
			right = "jsim._pop()";
		} else {
		    // Right side is anything but a user-defined function call.
			// E.g., uservar = builtinfunc(17); or builtinvar = builtinfunc(17);
			// In this case, we want the "normal" expression string
			// for the right side.
		    right = arrExprRight.join(" ");
		}
			
		// Emit step to assign expression to left side
		// Might be a _set() for user-defined lhs vars or
		// a simple assignment for built-in lhs vars
		if ( this.isUserVariable(node.left) ) {
			// Left hand side is a user variable. Use _set.
			ss = "jsim.stepsHash.addStepV(" +
				 this.makeQuotedStepName(curName, curNum) +
				 ", function() { jsim._set('" + node.left.name + "', " + right + "); }, " +
				 line + ", " +
				 this.makeQuotedStepName(curName, curNum + 1) + ", " +
				 this.makeQuotedStepName(null, null) + ", " + 
				 "null" + ", " +
				 "false, false);";
			sb.append(ss); sb.append("\n");
		} else {
			// Left hand side is a built-in variable or obj.prop

			// Generate expression for left side (could be Variable or PropertyAccess)
			arrExprLeft = [];
			this.ges(node.left, arrExprLeft, curName, curNum, subNum, sb);
			left = arrExprLeft.join(" ");
			
			// Create step that is simple lhs = rhs
			ss = "jsim.stepsHash.addStepV(" +
				 this.makeQuotedStepName(curName, curNum) +
				 ", function() { " + left + " " + node.operator + " " + right + "; }, " +
				 line + ", " +
				 this.makeQuotedStepName(curName, curNum + 1) + ", " +
				 this.makeQuotedStepName(null, null) + ", " + 
				 "null" + ", " +
				 "false, false);";
			sb.append(ss); sb.append("\n");
		}
		
	} else if ( typ === "PropertyAccess" ) {
        this.ges(node.base, curName, curNum, subNum, sb);
		arrExpr.push(".");
		this.ges(node.name, curName, curNum, subNum, sb);
		
	} else if ( typ === "FunctionCall" ) {
		jsim.validateObject  (node.name,      "jsim.generateExpressionStatement", "name");
		jsim.validateObject  (node.name.type, "jsim.generateExpressionStatement", "name.type");
		jsim.validateProperty(node.name.type, "jsim.generateExpressionStatement", "name.type", ["Variable", "PropertyAccess"]);
		jsim.validateObject  (node.arguments, "jsim.generateExpressionStatement", "arguments");
		jsim.validateObject  (node.name.name, "jsim.generateExpressionStatement", "name.name");

		// Generate expression for arguments (no surrounding parens or brackets)
		arrExprArgs = [];
		this.ges(node.arguments, arrExprArgs, curName, curNum, subNum, sb);
	    args = arrExprArgs.join(" ");
		
	    // The function being called could be a "built-in" function (like "move();")
	    // or a call to a user-defined function (within the pgm body)
	    // The former is called "as-is", the latter turns into a _call()
	    if ( this.isUserFunction(node) ) {
			// Call to a user-defined function
			// NOTE: For now, user-defined functions are always simple functions
			arrExpr.push("jsim._call(");
			// "Emit" function name (in quotes)
			arrExpr.push("'" + node.name.name + "'");
			arrExpr.push(", ");
			// "Emit" args now... (enclosed in open and close brackets)
			// Note: the separating commas are already in the arrExpr array
			arrExpr.push("[");
			// NOTE: For some reason, doing: arrExpr = arrExpr.concat(arrExprArgs);
			//       doesn't work (caller's array is missing closing parens)
			//       So we do it the hard way...
			for ( ii = 0, len = arrExprArgs.length; ii < len; ii += 1 ) {
		        arrExpr.push(arrExprArgs[ii]);
		    }
			arrExpr.push("])");
		} else {
            // Call to a "built-in" function
			// "Emit" function name or obj.prop (before open paren)
			if ( node.name.type === "Variable" ) { 
				arrExpr.push(node.name.name);
			} else if ( node.name.type === "PropertyAccess" ) {
			    this.ges(node.name.base, arrExpr, curName, curNum, subNum, sb);
				arrExpr.push(".");
				arrExpr.push(node.name.name);
			} else {
			    throw jsim.createException("jsim.ges", "Found unexpected name.type in FunctionCall node (built-in)", [node]);
			}
			// "Emit" args now (enclosed in open and close parens)...
			// Note: the separating commas are already in the arrExpr array
			arrExpr.push("(");
			// NOTE: For some reason, doing: arrExpr = arrExpr.concat(arrExprArgs);
			//       doesn't work (caller's array is missing closing parens)
			//       So we do it the hard way...
			for ( ii = 0, len = arrExprArgs.length; ii < len; ii += 1 ) {
		        arrExpr.push(arrExprArgs[ii]);
		    }
			arrExpr.push(")");
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
	this.ges(node.value, arrExpr, curName, curNum, 0, sb);
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
	    this.ges(decls[ii].value, arrExpr, curName, curNum, 0, sb);
	    initVal = arrExpr.join(" ");
		
		if ( ii === 0 ) {
		    // First var decl is step named <curName>_<curNum>
		    stepName = curName;
			stepNum  = curNum;
        } else {
		    // All other var decls are named <curName>_<curNum>_V_<ii>
			stepName = curName + "_" + curNum + "_V";
			stepNum  = ii;
		}
		
		if ( ii === len - 1 ) {
		    // Last var decl has nxt step <curName>_<curNum+1>
			nxtName = curName;
			nxtNum  = curNum + 1;
		} else {
		    // All other var decls have nxt steps of <curName>_<curNum>_V_<ii+1>
			nxtName  = curName + "_" + curNum + "_V";
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
		 this.makeQuotedStepName(curName + "_" + curNum + "_V", (len+1)) + ", " +
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
//     alert('foo');
//     my_karel_func('foo');
//     console.log('foo');
//     a = 'foo';             NOTE: AssignmentExpression handled specially
jsim.gssExpressionStatement = function(sb, node, curName, curNum) {
    "use strict";
	var line, arrExpr, expr, callTo, name, oFunction, ss;

	line = node.line || -1;

	this.validateObject(node.value,      "jsim.gssExpressionStatement", "value");
	this.validateObject(node.value.type, "jsim.gssExpressionStatement", "value.type");
	
	arrExpr = [];
    this.ges(node.value, arrExpr, curName, curNum, 0, sb);
	expr = arrExpr.join(" ");
	
	if ( node.value.type === "AssignmentExpression" ) {
	    // NOTE: TODO: For now, can only do x = ... Below _set would have to change
		//             to something like _set(_get()+xxx)
	    this.validateProperty(node.value.operator, "jsim.gssExpressionStatement", "value.operator", ["+"]);
	    // With an AssignmentExpression, there's a left hand side
		// Could be either a user-defined variable or a builtin variable or obj.prop
		if ( this.isUserVariable(node.value.left) ) {
		    // User-defined lhs variable: Emit step like "_set('leftVar', <expr>);"
		    ss = "jsim.stepsHash.addStepV(" +
			     this.makeQuotedStepName(curName + "_" + curNum + "_T", (ifLen+1)) + ", " +
			     "function() { jsim._set('" + node.value.name + "', [" + expr + "]); }, " +
			     line + ", " +
			     this.makeQuotedStepName(curName, (curNum+1)) + ", " +
			     "null" + ", " +
			     "null" + ", " +
			     "false, false);";
	        sb.append(ss); sb.append("\n");
		} else {
		    // Built-in lhs variable or obj.prop: Emit step like "<expr>;"
		    ss = "jsim.stepsHash.addStepV(" +
			     this.makeQuotedStepName(curName + "_" + curNum + "_T", (ifLen+1)) + ", " +
			     "function() { " + expr + "; }, " +
			     line + ", " +
			     this.makeQuotedStepName(curName, (curNum+1)) + ", " +
			     "null" + ", " +
			     "null" + ", " +
			     "false, false);";
	        sb.append(ss); sb.append("\n");
		}
	}
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
	
	if ( elsn === null ) {
	    elsLen = 0;
	} else if ( elsn.type === "Block" ) {
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
	
	// Generate expression for if condition
	arrExpr = [];
	this.ges(cond, arrExpr, curName, curNum, 0, sb);
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
	this.ges(cond, arrExpr, curName, curNum, 0, sb);
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
	this.ges(cond, arrExpr, curName, curNum, 0, sb);
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
	                        function() { jsim._call("main", []); },
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
