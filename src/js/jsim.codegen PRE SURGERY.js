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

// Given "foo" and 1, returns "'foo_1'" (note the single quote marks)
jsim.makeQuotedStepName = function(name, num) {
    "use strict";
	if ( name === null && num === null ) { return null; }
    return "'" + name + "_" + num + "'";
};

jsim.makeSimpleParamArray = function(arrArguments) {
    "use strict";
	var ii, len, arg, arr, varName;
	arr = [];
	for ( ii = 0, len = arrArguments.length; ii < len; ii += 1 ) {
	    arg = arrArguments[ii];
		jsim.validateObject(arg.type, "jsim.makeSimpleParamArray", "arg.type");
		if ( arg.type === "StringLiteral" ) {
		    arr.push('"' + arg.value + '"');  // NOTE: Notice the quotes!!!
		} else if ( arg.type === "NumericLiteral" ) {
		    arr.push(arg.value);
		} else if ( arg.type === "StringLiteral" ) {
		    arr.push(arg.value);
		} else if ( arg.type === "BooleanLiteral" ) {
		    arr.push(arg.value);
		} else if ( arg.type === "Variable" ) {
		    // Passing a variable as parameter (e.g., f(a))
			// "Emit" into the returned array a call to jsim._get() so value for this
			// variable will be acquired at run time
			jsim.validateObject(arg.name, "jsim.makeSimpleParamArray", "arg.name");
			varName = arg.name;
			arr.push("jsim._get('" + varName + "')");
		} else {
		    // QQQ TODO: SHOULD SUPPORT MORE TYPES HERE...
		    jsim.assert(1===0, "jsim.makeSimpleParamArray", "Unsupported arg.type", [arg.type]);
		}
	}
	return arr;
};

// Expects node to be a value node within syntax tree (e.g., VariableStatement.declarations[ii].value
jsim.generateValue = function(node) {
    "use strict";
	if ( node === null ) {
	    return "null";
	} else if ( node.type === "NullLiteral" ) {
	    return "null";
	} else if ( node.type === "NumericLiteral" ) {
	    return "" + node.value;
	} else if ( node.type === "StringLiteral" ) {
	    return "'" + node.value + "'";               // Note the single quotes added, surrounding the string
	} else if ( node.type === "BooleanLiteral" ) {
	    return node.value;
	} else {
	    jsim.assert(1===0, "jsim.generateValue", "Unsupported node.type", [node.type]);
	}
};

// Handles alert('foo'), my_karel_func('foo'), and console.log('foo')
jsim.generateExpressionStatementFunctionCall = function(sb, node, curName, curNum, nxtName, nxtNum, elsName, elsNum) {
    "use strict";
	var nxtName, nxtNum, elsName, elsNum, name, oFunction, ss, line, params;
	
    nxtName = nxtName || curName;
	nxtNum  = nxtNum  || curNum+1;
	elsName = elsName || null;
	elsNum  = elsNum  || null;

	jsim.validateProperty(node.value.type,      "jsim.generateExpressionStatement", "value.type", ["FunctionCall"]);
    jsim.validateObject  (node.value.name,      "jsim.generateExpressionStatement", "value.name");
    jsim.validateObject  (node.value.name.type, "jsim.generateExpressionStatement", "value.name.type");
	jsim.validateProperty(node.value.name.type, "jsim.generateExpressionStatement", "value.name.type", ["Variable", "PropertyAccess"]);
	jsim.validateObject  (node.value.name.name, "jsim.generateExpressionStatement", "value.name.name");
    jsim.validateObject  (node.value.arguments, "jsim.generateExpressionStatement", "value.arguments");
	if ( node.value.name.type === "PropertyAccess" ) {
	    jsim.validateObject  (node.value.name.base,      "jsim.generateExpressionStatement:PropertyAccess", "value.name.base");
	    jsim.validateProperty(node.value.name.base.type, "jsim.generateExpressionStatement:PropertyAccess", "value.name.base.type", ["Variable"]);
		jsim.validateObject  (node.value.name.base.name, "jsim.generateExpressionStatement:PropertyAccess", "value.name.base.name");
	}
	
    name = node.value.name.name;
	if ( node.value.name.type === "PropertyAccess" ) {
	    // QQQ User-defined variable??? Use _var???
	    name = node.value.name.base.name + "." + name;
	}
	line = node.line || -1;
	
	// The function being called could be a "built-in" function (like "move();")
	// or a call to a user-defined function (within the pgm body)
	// The former is called "as-is", the latter turns into a _call()
	oFunction = jsim.functionTable.getFunction(name);
	if ( ( typeof oFunction === 'undefined' ) || ( oFunction === null ) ) {
		// Call to a "built-in" function
		params = jsim.makeSimpleParamArray(node.value.arguments);
		ss = "jsim.stepsHash.addStepV(" + 
			 this.makeQuotedStepName(curName, curNum) + ", " +
			 "function() { " + name + 
			 "(" +
			 ((params === null || params.length === 0) ? "" : params.join(", ")) +
			 ");" +
			 " }, " +
			 line + ", " +
			 this.makeQuotedStepName(nxtName, nxtNum) + ", " +
			 this.makeQuotedStepName(elsName, elsNum) + ", " + 
			 "null" + ", " +
			 "false);";
		sb.append(ss); sb.append("\n");
    } else {
		// Call to a user-defined function
		params = jsim.makeSimpleParamArray(node.value.arguments);
		ss = "jsim.stepsHash.addStepV(" +
			 this.makeQuotedStepName(curName, curNum) + ", " +
			 "function() { jsim._call('" + name + "'" + ", " + 
			 ((params === null || params.length === 0) ? "[]" : "[" + params.join(", ") + "]") + ", " +
			 "null" /* QQQ */ + "); }" + ", " +
			 line + ", " +
			 this.makeQuotedStepName(nxtName, nxtNum) + ", " +
			 this.makeQuotedStepName(elsName, elsNum) + ", " +
			 "'" + name + "'" + ", " +
			 "false);";
		sb.append(ss); sb.append("\n");
    }
};

// Handles a = 17; etc.
jsim.generateExpressionStatementAssignmentExpression = function(sb, node, curName, curNum, 
        nxtName, nxtNum, elsName, elsNum) {
    "use strict";
	var nxtName, nxtNum, elsName, elsNum, line, left, right, op, ss;
	
    nxtName = nxtName || curName;
	nxtNum  = nxtNum  || curNum+1;
	elsName = elsName || null;
	elsNum  = elsNum  || null;
	
	jsim.validateProperty(node.value.type,      "jsim.generateExpressionStatement", "value.type", ["AssignmentExpression"]);
	jsim.validateObject  (node.value.left,      "jsim.generateExpressionStatement:AssignmentExpression", "value.left");
	jsim.validateProperty(node.value.left.type, "jsim.generateExpressionStatement:AssignmentExpression", "value.left.type", ["Variable"]);
	jsim.validateObject  (node.value.left.name, "jsim.generateExpressionStatement:AssignmentExpression", "value.left.name");
	jsim.validateObject  (node.value.right,     "jsim.generateExpressionStatement:AssignmentExpression", "value.right");
    jsim.validateProperty(node.value.operator,  "jsim.generateExpressionStatement:AssignmentExpression", "value.operator", ["="]);
	line = node.line || -1;
	left = node.left; op = node.operator; right = node.right;
	ss = "jsim.stepsHash.addStepV(" + 
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 "function() { jsim._set('" + 
		 node.value.left.name +
		 "', " +
		 this.generateValue(node.value.right) +
		 ");" +
		 " }, " +
		 line + ", " +
		 this.makeQuotedStepName(nxtName, nxtNum) + ", " +
		 this.makeQuotedStepName(elsName, elsNum) + ", " + 
		 "null" + ", " +
		 "false);";
	sb.append(ss); sb.append("\n");
};



// --------------- Begin Generate Step Strings (gss) Functions ---------------

// gssFunction -- Generate Steps Strings for Function node
jsim.gssFunction = function(sb, node, curName, curNum, 
                            nxtName, nxtNum, 
							elsName, elsNum) {
    var line, ss, ii, len, lastLine;
	
	nxtName = nxtName || curName;
	nxtNum  = nxtNum  || curNum+1;
	elsName = elsName || null;
	elsNum  = elsNum  || null;
	
	line = node.line || -1;
	
	// "Landing" step for function... No op.
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(node.name, 0) +
		 ", function() { jsim._noop(); }, " +
		 line + ", " +
		 this.makeQuotedStepName(node.name, 1) + ", " +
		 this.makeQuotedStepName(null, null) + ", " + 
		 "null" + ", " +
		 "false);";
	sb.append(ss); sb.append("\n");
	
	// Body of function
	for ( ii = 0, len = node.elements.length; ii < len; ii += 1 ) {
		this.gss(sb, node.elements[ii], node.name, ii + 1, null, null, null, null);
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
		 "true);";
	sb.append(ss); sb.append("\n");
};

// gssReturnStatement -- Generate Steps String for ReturnStatement node
jsim.gssReturnStatement = function(sb, node, curName, curNum, 
                                   nxtName, nxtNum, 
							       elsName, elsNum) {
    var ss, line;
	
	nxtName = nxtName || curName;
	nxtNum  = nxtNum  || curNum+1;
	elsName = elsName || null;
	elsNum  = elsNum  || null;
	
	line = node.line || -1;
	
	jsim.validatePossiblyNullObject(node.value, "jsim.gssReturnStatement", "value");
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 "function() { jsim._return(" +
		 ((node.value === null) ? "null" : this.generateValue(node.value)) +
		 "); }, " +
		 line + ", " +
		 this.makeQuotedStepName(null, null) + ", " + 
		 this.makeQuotedStepName(null, null) + ", " + 
		 "null" + ", " + 
		 "true);";
	sb.append(ss); sb.append("\n");
};

// gssVariableStatement -- Generate Steps Strings for VariableStatement node
jsim.gssVariableStatement = function(sb, node, curName, curNum, 
                                     nxtName, nxtNum,
						             elsName, elsNum) {
    var ss, line, decls, ii, len;
	
	nxtName = nxtName || curName;
	nxtNum  = nxtNum  || curNum+1;
	elsName = elsName || null;
	elsNum  = elsNum  || null;
	
	line = node.line || -1;
	
	decls = node.declarations;
	jsim.validateObject(decls, "jsim.gssVariableStatement", "declarations");
	this.assert(decls.length > 0, "jsim.gssVariableStatement", "Empty declarations", []);
	for ( ii = 0, len = decls.length; ii < len; ii += 1 ) {
		this.validateProperty(decls[ii].type, "jsim.gssVariableStatement", "declarations[].type", ["VariableDeclaration"]);
		this.validateObject  (decls[ii].name, "jsim.gssVariableStatement", "declarations[].name");
		this.validatePossiblyNullObject(decls[ii].value, "jsim.gssVariableStatement", "declarations[].value");
		initVal = jsim.generateValue(decls[ii].value);
		ss = "jsim.stepsHash.addStepV(" +
		     this.makeQuotedStepName(curName, curNum) + ", " +
		     "function() { jsim._var('" + decls[ii].name + "', " + initVal + "); }, " +
		     line + ", " +
		     this.makeQuotedStepName(curName, curNum+1) + ", " + 
		     this.makeQuotedStepName(null, null) + ", " + 
		     "null" + ", " + 
		     "false);";
		sb.append(ss); sb.append("\n");
	}
};

// gssExpressionStatement -- Generate Steps Strings for ExpressionStatement node
jsim.gssExpressionStatement = function(sb, node, curName, curNum, 
                                       nxtName, nxtNum, 
									   elsName, elsNum) {
    "use strict";
	
	nxtName = nxtName || curName;
	nxtNum  = nxtNum  || curNum+1;
	elsName = elsName || null;
	elsNum  = elsNum  || null;
	
	//qqq line = node.line || -1;
	
    jsim.validateObject(node.value,           "jsim.generateExpressionStatement", "value");
	jsim.validateObject(node.value.type,      "jsim.generateExpressionStatement", "value.type");
	// QQQ FIX... USE GENERIC RECURSION ON EXPRESSIONS???
	if ( node.value.type === "FunctionCall" ) {
        return this.generateExpressionStatementFunctionCall(sb, node, curName, curNum, nxtName, nxtNum, elsName, elsNum);
	} else if ( node.value.type === "AssignmentExpression" ) {
        return this.generateExpressionStatementAssignmentExpression(sb, node, curName, curNum, nxtName, nxtNum, elsName, elsNum);
	} else {
	    this.assert(1===0, "jsim.generateExpressionStatement", "Unsupported value.type", [node.value.type]);
	}
};

// gssIfStatement -- Generate Steps Strings for IfStatement node
//
// if (cond) {                  step f_n  : _cond      (nxt: f_n_1, els: f_m)
//   stmt1              ==>     step f_n_1: stmt1      (nxt: f_n_2, els: -)
//   stmt2                      step f_n_2: stmt2      (nxt: f_n_3, els: -)
//   stmt3                      step f_n_3: stmt3      (nxt: f_n  , els: -)
// }
//
// if (cond) {                  step f_n  : _cond      (nxt: f_n_1, els: f_n_4)
//   stmt1              ==>     step f_n_1: stmt1      (nxt: f_n_2, els: -)
//   stmt2                      step f_n_2: stmt2      (nxt: f_n_3, els: -)
//   stmt3                      step f_n_3: stmt3      (nxt: f_m  , els: -)
// } else {
//   stmt4                      step f_n_4: stmt4      (nxt: f_n_5, els: -)
//   stmt5                      step f_n_5: stmt5      (nxt: f_m  , els: -)
// }
//
jsim.gssIfStatement = function(sb, node, curName, curNum, 
                               nxtName, nxtNum,
						       elsName, elsNum) {
    var ss, line, cond, ifn, elsn, ii, len, 
	    ifInnards, elseInnards, condIfName, condIfNum, condElseName, condElseNum;
	
	nxtName = nxtName || curName;
	nxtNum  = nxtNum  || curNum+1;
	elsName = elsName || null;
	elsNum  = elsNum  || null;
	
	line = node.line || -1;
	
	cond = node.condition;       // condition sub Node
	ifn  = node.ifStatement;     // ifStatement sub Node
	elsn = node.elseStatement;   // elseStatement sub Node
	
	jsim.validateObject  (cond,           "jsim.gssIfStatement", "condition");
	jsim.validateProperty(cond.type,      "jsim.gssIfStatement", "condition.type", ["FunctionCall"]);
	jsim.validateObject  (cond.name,      "jsim.gssIfStatement", "condition.name");
	jsim.validateProperty(cond.name.type, "jsim.gssIfStatement", "condition.name.type", ["Variable"]);
	jsim.validateObject  (cond.name.name, "jsim.gssIfStatement", "condition.name.name");
	jsim.validateObject  (cond.arguments, "jsim.gssIfStatement", "condition.arguments");
	jsim.validateObject  (ifn,            "jsim.gssIfStatement", "ifStatement");
	jsim.validateObject  (ifn.type,       "jsim.gssIfStatement", "ifStatement.type");

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
	// - Otherwise go to next statement after the if[..else]
	
	if  ( ( ifn.type === "Block" ) &&
	      ( ( typeof ifn.statements === "undefined" ) ||
		    ( ifn.statements === null ) ||
		   ( ifn.statements.length === 0 ) )
        ) {
	    ifInnards = false;
	} else {
	    ifInnards = true;
	}
	
	if  ( ( elsn.type === "Block" ) &&
	      ( ( typeof elsn.statements === "undefined" ) ||
		    ( elsn.statements === null ) ||
		   ( elsn.statements.length === 0 ) )
        ) {
	    elsInnards = false;
	} else {
	    elsInnards = true;
	}
	
	if ( ifInnards ) {
	    condIfName = curName + "_" + curNum + "_T";
		condIfNum  = 1
	} else {
	    condIfName = curName;
		condIfNum  = curNum + 1;
	}
	
	if ( elsInnards ) {
	    condElsName = curName + "_" + curNum + "_F";
		condElsNum  = 1;
	} else {
	    condElsName = curName;
		condElsNum  = curNum + 1;
	}
	
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 "function() { return jsim._cond(" + cond.name.name + "()" + "); }, " + /*QQQ args!*/
		 line + ", " +
		 this.makeQuotedStepName(condIfName, condIfNum) + ", " +
		 this.makeQuotedStepName(condElsName, condElsNum) + ", " +
		 "null" + ", " +
		 "false);";
	sb.append(ss); sb.append("\n");		
	
	// Body of the "if" part of the if statement
	if ( ifn.type === "Block" ) {
	    jsim.validateObject(ifn.statements, "jsim.gssIfStatement", "ifStatements.statements");
		// Body of if portion of if statement is a Block... emit steps for
		// each statement in the block
		len = ifn.statements.length;
		if ( len > 0 ) {
			for ( ii = 0; ii < len; ii += 1 ) {
			    if ( ii !== len - 1 ) {
				    // All but the last step in if block go to next step w/in if block
				    //qqq nxtName = curName + "_" + curNum + "_T";
					//qqq nxtNum  = ii + 2;
					nxtName = null;
					nxtNum  = null;
				} else {
				    // Last step in if block goes to next step after if[/else]
				    nxtName = curName;
					nxtNum  = curNum + 1;
				}
				this.gss(sb, ifn.statements[ii],
				         curName + "_" + curNum + "_T", ii+1,
						 nxtName, nxtNum,
						 null, null);
			}
		}
	} else {
	    // Body of if portion of if statement is a single statement
		this.gss(sb, ifn,
				 curName + "_" + curNum + "_T", 1,
				 curName, curNum+1,
				 null, null);
	}
		
	// Body of the "else" part of the if statement, if present
	if ( ( typeof elsn !== "undefined" ) && ( elsn !== null ) ) {
	    this.validateObject(elsn.type, "jsim.gssIfStatement", "elseStatement.type");
		// A real elseStatement exists
		if ( elsn.type === "Block" ) {
		    this.validateObject(elsn.statements, "jsim.gssIfStatement", "elseStatement.statements");
			// Body of else portion of if statement is a Block... emit steps for each statement in the block
			len = elsn.statements.length;
			if ( len > 0 ) {
				for ( ii = 0; ii < len; ii += 1 ) {
				    if ( ii !== len - 1 ) {
					    // All but the last step in else block go to next step w/in else block
					    //qqq nxtName = curName + "_" + curNum + "_F";
						//qqq nxtNum  = ii + 2;
						nxtName = null;
						nxtNum  = null;
					} else {
					    // Last step in else block goes to next step after if[/else]
					    nxtName = curName;
						nxtNum  = curNum + 1;
					}
					this.gss(sb, elsn.statements[ii], 
					         curName + "_" + curNum + "_F", ii+1, 
							 nxtName, nxtNum,
							 null, null);
				}
			}
		} else if ( elsn.type === "IfStatement" ) {
			// Body of else portion of if statement is another if; i.e., if..else if..
			this.gss(sb, elsn,
			         curName + "_" + curNum + "_F", 1,
			         nxtName, nxtNum,
					 null, null);
		} else {
			// Body of else portion of if statement is a single statement (non-if)
		    this.gss(sb, elsn,
				 curName + "_" + curNum + "_F", 1,
				 //qqq curName, curNum+1,
				 null, null,
				 null, null);
        }
	}
};

// gssWhileStatement -- Generate Steps Strings for WhileStatement node
//
// while (cond) {               step f_n  : _cond      (nxt: f_n_1, els: f_m)
//   stmt1              ==>     step f_n_1: stmt1      (nxt: f_n_2, els: -)
//   stmt2                      step f_n_2: stmt2      (nxt: f_n_3, els: -)
//   stmt3                      step f_n_3: stmt3      (nxt: f_n  , els: -)
// }
//
jsim.gssWhileStatement = function(sb, node, curName, curNum, 
                                  nxtName, nxtNum,
				   		          elsName, elsNum) {
    var ss, line, cond, stmt, ii, len;
	
	nxtName = nxtName || curName;
	nxtNum  = nxtNum  || curNum+1;
	elsName = elsName || null;
	elsNum  = elsNum  || null;
	
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
	// Condition step, which will determine whether we go "into" the while loop
	// or whether we go to the statement just after the while loop ends
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 "function() { return jsim._cond(" + cond.name.name + "()" + "); }, " +  /* QQQ args! */
		 line + ", " +
		 this.makeQuotedStepName(curName + "_" + curNum, 1) + ", " +
		 this.makeQuotedStepName(curName, curNum+1) + ", " +
		 "null" + ", " +
		 "false);";
	sb.append(ss); sb.append("\n");

	// Body step(s)
	if ( stmt.type === "Block" ) {
		// Body of while loop is a Block... emit steps for each statement in the block
		this.validateObject(stmt.statements, "jsim.gssWhileStatement", "statement.statements");
		for ( ii = 0, len = stmt.statements.length; ii < len; ii += 1 ) {
		    if ( ii !== len - 1 ) {
			    // After all but last statement in while loop body, go to next statement
			    nxtName = curName + "_" + curNum;
				nxtNum  = ii+2;
			} else {
			    // After last statement in while loop body, go back to first statement
			    nxtName = curName;
				nxtNum  = curNum;
			}
			this.gss(sb, stmt.statements[ii], 
			         curName + "_" + curNum, ii+1, 
					 nxtName, nxtNum, null, null);
		}
	} else {
		// Body of while loop is a single statement of some kind
		this.gss(sb, stmt,
			 curName + "_" + curNum, 1,
			 curName, curNum,
			 null, null);
	}
};

// gssDoWhileStatement -- Generate Steps Strings for DoWhileStatement node
//
// do {                         
//   stmt1              ==>     step f_n  : stmt1      (nxt: f_n_1, els: -)
//   stmt2                      step f_n_1: stmt2      (nxt: f_n_2, els: -)
//   stmt3                      step f_n_2: stmt3      (nxt: f_n_3, els: -)
// } while (cond)               step f_n_3: _cond      (nxt: f_n  , els: f_m)
//
jsim.gssDoWhileStatement = function(sb, node, curName, curNum, 
                                    nxtName, nxtNum,
			  	   		            elsName, elsNum) {
    var ss, line, cond, stmt, ii, len, thisName, thisNum;
	
	nxtName = nxtName || curName;
	nxtNum  = nxtNum  || curNum+1;
	elsName = elsName || null;
	elsNum  = elsNum  || null;
	
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
	// Body step(s)
	if ( stmt.type === "Block" ) {
		// Body of do loop is a Block... emit steps for each statement in the block
		this.validateObject(stmt.statements, "jsim.gssDoWhileStatement", "statement.statements");
		for ( ii = 0, len = stmt.statements.length; ii < len; ii += 1 ) {
		    if ( ii === 0 ) {
			    // First step is named <curName>_<curNum>
				thisName = curName; 
				thisNum  = curNum;
			} else {
			    // All but first step are named <curName>_<curNum>_<#>
				thisName = curName + "_" + curNum;
				thisNum  = ii;
			}
			nxtName  = curName + "_" + curNum;
			nxtNum   = ii + 1;
			this.gss(sb, stmt.statements[ii], thisName, thisNum, nxtName, nxtNum, null, null);
		}
	} else {
	    // Body of do loop is a single Statement of some kind {
	    this.gss(sb, stmt,
			 curName, curNum,
			 curName + "_" + curNum, 1,
			 null, null);
	}
	
	// Condition step, which will determine whether we go "into" the while loop
	// or whether we go to the statement just after the while loop ends
	ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(curName + "_" + curNum, len) + ", " +
		 "function() { return jsim._cond(" + cond.name.name + "()" + "); }, " +  /* QQQ args! */
		 line + ", " +
		 this.makeQuotedStepName(curName, curNum) + ", " +
		 this.makeQuotedStepName(curName, curNum+1) + ", " +
		 "null" + ", " +
		 "false);";
	sb.append(ss); sb.append("\n");
};

// gssEmptyStatement -- Generate Steps String for EmptyStatement node
jsim.gssEmptyStatement = function(sb, node, curName, curNum, 
                                  nxtName, nxtNum,
			  	   		          elsName, elsNum) {
    var line, ss;
	
	line = node.line || -1;
	
    ss = "jsim.stepsHash.addStepV(" +
		 this.makeQuotedStepName(node.name, 0) +
		 ", function() { jsim._noop(); }, " +
		 line + ", " +
		 this.makeQuotedStepName(node.name, 1) + ", " +
		 this.makeQuotedStepName(null, null) + ", " + 
		 "null" + ", " +
		 "false);";
	    sb.append(ss); sb.append("\n");
};
		
// gss -- Main Generate Steps String Function
// Internally called by generateSteps()
// Builds up "code" (in the form of a string), which will get "executed"
// so as to create real jsim Step objects, which can then be simulated.
jsim.gss = function(sb, node, curName, curNum, 
                    nxtName, nxtNum, 
					elsName, elsNum) {
    var typ, line, ss, ii, len, thisName, thisNum, 
	    nxtName, nxtNum, elsName, elsNum, oFunction, name, initVal;
	
	if ( jsim.isArray(node) ) {
	    for ( ii = 0, len = node.length; ii < len; ii += 1 ) {
		    this.gss(sb, node[ii], curName, curNum+ii, null, null, null, null);
		}
		return;
	}

	typ = node.type;
	line = node.line || -1;
	
	if ( typ === "Program" ) {
		this.gss(sb, node.elements, curName, curNum, null, null, null, null);

	} else if ( typ === "Function" ) {
        this.gssFunction(sb, node, curName, curNum, null, null,  null, null);

	} else if ( typ === "ReturnStatement" ) {
        this.gssReturnStatement(sb, node, curName, curNum, null, null, null, null);
	
	} else if ( typ === "VariableStatement" ) {
        this.gssVariableStatement(sb, node, curName, curNum, null, null, null, null);
	
	} else if ( typ === "ExpressionStatement" ) {
		this.gssExpressionStatement(sb, node, curName, curNum, nxtName, nxtNum, elsName, elsNum);
																
	} else if ( typ === "IfStatement" ) {
        this.gssIfStatement(sb, node, curName, curNum, null, null, null, null);
			
	} else if ( typ === "WhileStatement" ) {
        this.gssWhileStatement(sb, node, curName, curNum, null, null, null, null);
		
	} else if ( typ === "DoWhileStatement" ) {
        this.gssDoWhileStatement(sb, node, curName, curNum, null, null, null, null);
								 
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
	    this.gssEmptyStatement(sb, node, curName, curNum, null, null, null, null);
		
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
							false);
									 
	// Create string that holds 'code' that add steps to stepsHash 
	// based on this.syntax, the syntax tree, for the current program
	sb = new jsim.StringBuilder();
	this.gss(sb, this.syntax, "", 0, null, null, null, null);
	cod = sb.toString();
	
    console.log("\nGenerated Code");	
	console.log(cod);
	// Actually run this generated code... this will populate stepsHash with Steps
	jsim.runFunction(cod);
};

return jsim;

});
