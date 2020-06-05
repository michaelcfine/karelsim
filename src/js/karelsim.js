// karelsim.js
//
// Karel the Robot simulator, using JavaScript as the programming language
// Based on "Karel the Robot" by Richard E. Pattis and revised by
// Jim Roberts and Mark Stehlik
//
// Created: 12/15/2012
//      by: Mike Fine (michaelcfine@gmail.com)
//

define(
["jsim", "worldsim", "worldsim.karelsim"],
function(jsim, WORLDSIM, worldsimkarelsim) {

// === Global karelsim object ===

var karelsim = {

    // === Constants ===
	
    MAXMAXWX: 12,  // Maximum x dimension (width)  of Karel's World (max maxwx value)
    MAXMAXWY: 12,  // Maximum y dimension (height) of Karel's World (max maxwy value)

    // Bit masks for walls (can be added to simulate ANDing)
    TOP: 8, RIGHT: 4, BOTTOM: 2, LEFT: 1,

    // If you turn left/right facing a given direction (key), what direction do you
	// end up facing (value)
    LEFTTURN:  { "north":"west", "west":"south", "south":"east", "east":"north" },
    RIGHTTURN: { "north":"east", "east":"south", "south":"west", "west":"north" },

    // If you move 'forward' while facing a given direction (key), what is the 
	// change in your x or y position (value)
    XDELTA:{ "north":0, "west":-1, "south": 0, "east":1 },
    YDELTA:{ "north":1, "west": 0, "south":-1, "east":0 },
	
	// === Simulator State Information (Variables) ===

	// ----- BEGIN KAREL'S WORLD STATE INFO -----
	
	// Collectively, the values of these variables represent the state of Karel's
    // world.
	
	// Some details about the world, initially:
    // - Karel's initial position is set to (1, 1) facing north and turned on
	// - There are no walls in the world
    // - There are no beepers lying around
	// - Karel has no beepers in his beeper bag
	// NOTE: maxrx_ and maxry_ are not considered part of the world's state
	//       since the "world coordinate" versions of these (maxwx_, maxwy_) are used
	
    // Width (x) and height (y) of Karel's world
    maxwx_: 5,  // Starter values     
    maxwy_: 4,  // just to have something reasonable

    // Width (x) and height (y) of DOM representation/implementation
    // Note that the DOM representation is twice as wide and twice as high
    // as the world because intersections and walls each occupy cells in 
	// the DOM, while only intersections are represented as "positions" in 
	// Karel's world (walls are "between" intersections).
    maxrx_: 10, //2*karelsim.maxwx_,
    maxry_: 8,  //2*karelsim.maxwy_,

	// NOTES:
	// - Legal karelStatus values: "on" or "off"
	// - Legal karelDir values: "north", "south", "east", "west"
	// - numBeepersInWorld contains denormalized count of keys in beepersInWorld hash
	
    karelwx:               1,                // Karel's x coordinate (in Karel's world)
    karelwy:               1,                // Karel's y coordinate (in Karel's world)
    karelDir:              "north",          // Karel is facing this way (e.g., "north")
    karelStatus:           "on",             // Karel's status ("on" or "off")
	walls:                 {},               // Walls "hash" (<rx><ry>: wallType)
	beepersInWorld:        {},               // Beepers "hash" (<rx><ry>: numBeepers)
    numBeepersInWorld:     0,                // Number of beepers in the world
    numBeepersInKarelsBag: 0,                // Number of beepers in Karel's beeper bag

    // ----- END KAREL'S WORLD STATE INFO -----
	
    activeIconId:          '',               // HTML id of icon bar icon that's active

	lastGrammarChosen:     null,             // TS when grammar was last chosen/set
    lastPassedSyntaxCheck: null,             // TS when pgm last passed syntax check
    lastProgramEdit:       null,             // TS when pgm was last edited/changed
    lastProgramReset:      null              // TS when pgm was last reset to beginning

};



// === Generic/Utility Functions/"Classes" within karel object ===

// StringBuilder "class"
karelsim.StringBuilder = function(value) { this.strings = new Array(""); this.append(value); }
karelsim.StringBuilder.prototype.append = function(value) { if (value) { this.strings.push(value); } }
karelsim.StringBuilder.prototype.clear = function() { this.strings.length = 1; }
karelsim.StringBuilder.prototype.toString = function() { return this.strings.join(""); }

// now -- Return current timestamp
karelsim.now = function() { return (new Date()).getTime(); };

// twoDigit -- Convert number into two digit string, adding leading zero if necessary
karelsim.twoDigit = function(n) {
    if ( n < 10 ) {
        return ( '0' + n );
	} else {
    	return ( '' + n );
	}
};

// showInfo -- Fill DOM element with given ID with the given HTML
karelsim.showInfo = function(spanId, msg) {
    "use strict";
	$("#" + spanId).html(msg);
};

// prependInfo -- Append new messages at the front... most recent messages appear "on top"
karelsim.prependInfo = function(spanId, msg) {
    "use strict";
	var $span = $("#" + spanId);
	$span.html(msg + "<br />" + $span.html());
};

// copyToClipboard -- A simple way to let the user hit Ctrl-C on some text
karelsim.copyToClipboard = function(text) {
    window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
}

// callFunctionByName -- Given a function name (e.g., 'world1'), invoke the function
//                       with that name. Returns value returned by function.
karelsim.callFunctionByName = function(sFunctionName) { return window[sFunctionName](); };

// callMethodByName == Given an object and a method name, invoke the method on 
//                     the object. Returns value returned by method.
karelsim.callMethodByName = function(obj, sMethodName) { return obj[sMethodName].apply([]); };

// insertAtCaret -- Insert given piece of text at the cursor/caret position within the
// textarea with the given id. Copied from:
// http://www.scottklarr.com/topic/425/
//         how-to-insert-text-into-a-textarea-where-the-cursor-is/
karelsim.insertAtCaret = function(areaId,text) {
    var txtarea = document.getElementById(areaId);
	var scrollPos = txtarea.scrollTop;
	var strPos = 0;
	var br = ( (txtarea.selectionStart || txtarea.selectionStart == '0') ?
               "ff" :
			   (document.selection ? "ie" : false ) );
	if (br == "ie") {
	    txtarea.focus(); 
		var range = document.selection.createRange(); 
		range.moveStart ('character', -txtarea.value.length);
		strPos = range.text.length;
	} else if (br == "ff") {
	    strPos = txtarea.selectionStart;
	}

	var front = (txtarea.value).substring(0,strPos);
	var back = (txtarea.value).substring(strPos,txtarea.value.length);
	txtarea.value=front+text+back;
	strPos = strPos + text.length;
	if (br == "ie") {
    	txtarea.focus();
		var range = document.selection.createRange(); 
		range.moveStart ('character', -txtarea.value.length); 
		range.moveStart ('character', strPos); 
		range.moveEnd ('character', 0); 
		range.select(); 
	} else if (br == "ff") {
	    txtarea.selectionStart = strPos; 
		txtarea.selectionEnd = strPos; 
		txtarea.focus(); 
	} 
	txtarea.scrollTop = scrollPos;
};



// === GRAMMARS ===

karelsim.getGrammar = function(grammarCode) {
    "use strict";
	var url, sGrammar;
	
	if ( grammarCode === "JAVASCRIPT_CORE" ) {
	    url = "/js/grammars/javascript.pegjs.txt";
	//TODO: } else if ( grammarCode === "KARELSCRIPT_CORE" ) {
	//TODO:     url = "/js/grammars/karelscript.pegjs.txt";
	} else {
	    karelsim.errorMessage('Invalid grammar. Using JavaScript.');
	    url = "/js/grammars/javascript.pegjs.txt";
	}

	try {
	    $.ajax({
            url: url,
			async: false,
            success: function(data, textStatus, jqXHR) {
                sGrammar = data;
            },
			error: function(jqXHR, textStatus, errorThrown) {
			    karelsim.errorMessage("An internal error occurred trying to get grammar '" +
                                      grammarCode + "'");
	            console.log("karelsim.getGrammar: Error: ", 
				            grammarCode, jqXHR, textStatus, errorThrown);
		        sGrammar = null;
			},
			complete: function(jqXHR, textStatus) {
			}
        });
	} catch ( ex ) {
	    karelsim.errorMessage("An internal error occurred trying to get JavaScript grammar");
	    console.log("karelsim.getGrammar: Exception: ", ex);
		sGrammar = null;
	}
	return sGrammar;
};



// === LOW-LEVEL FUNCTIONS TO INSPECT/MANIPULATE KAREL'S WORLD ===

// Convert from Karel's World coordinates to DOM-based coordinates
karelsim.w2rx = function(wx) { return ( 2*wx - 2); };
karelsim.w2ry = function(wy) { return ( karelsim.maxry_ - 2*wy ); };

// Convert from DOM-based coordinates to Karel's World coordinates
karelsim.r2wx = function(rx) { return ( (rx + 2)/2 ); };
karelsim.r2wy = function(ry) { return ( (karelsim.maxry_ - ry)/2 ); }

// Used to create ids and names for DOM elements (note use of DOM-based coordinates)
karelsim.constructCellName = function(rx, ry) {
    return ( 'cell_'+karelsim.twoDigit(rx)+'_'+karelsim.twoDigit(ry) );
};
karelsim.constructSpanName = function(rx, ry) {
    return ( 'span_'+karelsim.twoDigit(rx)+'_'+karelsim.twoDigit(ry) );
};



// Set the dimensions of Karel's world (and keep DOM-based dimensions in sync)
karelsim.setMaxwx = function(maxwx) {
    karelsim.maxwx_ = maxwx;
	karelsim.maxrx_ = 2*karelsim.maxwx_;
};
karelsim.setMaxwy = function(maxwy) {
    karelsim.maxwy_ = maxwy;
    karelsim.maxry_ = 2*karelsim.maxwy_;
};



// setKarelStatus -- sts must be 'on' or 'off' (not enforced)
karelsim.setKarelStatus = function(sts) {
	karelsim.karelStatus = sts;
	WORLDSIM.worldController.world.karel.setStatus(sts);  // UI
};

// setKarelPosition -- coordinates are in World coordinates (not DOM), 
//                     validated, and possibly ignored.
//                     Dir must be legal (not enforced).
karelsim.setKarelPosition = function(wx, wy) {
    if ( ( karelsim.karelwx <= 0 ) || 
	     ( karelsim.karelwy <= 0 ) || 
	     ( karelsim.karelwx > karelsim.maxwx_ ) || 
		 ( karelsim.karelwy > karelsim.maxwy_ ) ) {
	    console.log("setKarelPosition: ERROR: " +
		            "Asked to put Karel at an invalid location: (" +
					wx + ", " + wy + ").");
		return;
	}
	karelsim.karelwx = wx;
	karelsim.karelwy = wy;
	
	WORLDSIM.worldController.world.karel.setLocation(wx, wy);  // UI
};

// setKarelDirection -- dir must be 'north', 'south', 'east' or 'west' (not enforced)
karelsim.setKarelDirection = function(dir) {
	karelsim.karelDir = dir;
	WORLDSIM.worldController.world.karel.setDirection(dir);  // UI
};

// setKarel -- set Status, Position, and Direction all at once
karelsim.setKarel = function(status, wx, wy, dir) {
    this.setKarelStatus(status);
	this.setKarelPosition(wx, wy);
	this.setKarelDirection(dir);
};

// errorTurnOff -- Turns Karel off in response to an error condition
karelsim.errorTurnOff = function() {
    karelsim.setKarelStatus('off');
	WORLDSIM.worldController.world.karel.turnOff();  // UI
};

karelsim.setNumBeepersInKarelsBag = function(numBeepers) {
    "use strict";
	karelsim.numBeepersInKarelsBag = numBeepers; 
    WORLDSIM.worldController.world.karel.setNumBeepersInBag(numBeepers);  // UI
};

karelsim.increaseNumBeepersInKarelsBag = function() {
    "use strict";
	karelsim.numBeepersInKarelsBag += 1; 
    WORLDSIM.worldController.world.karel.addBeeperToBag();  // UI
};

karelsim.decreaseNumBeepersInKarelsBag = function() {
    "use strict";
	karelsim.numBeepersInKarelsBag -= 1;
    WORLDSIM.worldController.world.karel.removeBeeperFromBag();  // UI
};

// addBeeper -- Add a beeper at given (World) coordinates
karelsim.addBeeper = function(wx, wy) {
    "use strict";
    var key;
	key = this.twoDigit(this.w2rx(wx)) + this.twoDigit(this.w2ry(wy));
	if ( this.beepersInWorld.hasOwnProperty(key) ) {
	    // There is already at least one beeper at this location
		this.beepersInWorld[key] = this.beepersInWorld[key] + 1;
	} else {
	    this.beepersInWorld[key] = 1;
	}
	karelsim.numBeepersInWorld += 1; 
	WORLDSIM.worldController.world.addBeeper(wx, wy);  // UI
};

// removeBeeper -- Remove a beeper at given (World) coordinates
karelsim.removeBeeper = function(wx, wy) {
    "use strict";
    var key;
	key = this.twoDigit(this.w2rx(wx)) + this.twoDigit(this.w2ry(wy));
	if ( this.beepersInWorld.hasOwnProperty(key) ) {
	    // There is at least one beeper at this location... okay to remove
		if ( this.beepersInWorld[key] === 1 ) {
		    // Only one... we're removing the last beeper
			delete this.beepersInWorld[key];
		} else {
		    // We're leaving at least one beeper behind
    		this.beepersInWorld[key] = this.beepersInWorld[key] - 1;
		}
	} else {
	    // TODO: Internal error! No beeper to remove. Quiet failure
	}
	karelsim.numBeepersInWorld -= 1; 
	WORLDSIM.worldController.world.removeBeeper(wx, wy);  // UI
};

// removeAllBeepers -- Remove any/all beepers at given (World) coordinates
karelsim.removeAllBeepers = function(wx, wy) {
    "use strict";
	var key;
	key = this.twoDigit(this.w2rx(wx)) + this.twoDigit(this.w2ry(wy));
	// Keep our denormalized count accurate
	if ( this.beepersInWorld.hasOwnProperty(key) ) {
	     this.numBeepersInWorld = this.numBeepersInWorld - this.beepersInWorld[key];
		 delete this.beepersInWorld[key];
	}
	WORLDSIM.worldController.world.removeAllBeepers(wx, wy);  // UI
};

// numBeepersAt -- Return number of beepers in Karel's world at the given
//                 (World) coordinates
karelsim.numBeepersAt = function(wx, wy) {
    "use strict";
	var key;
	key = this.twoDigit(this.w2rx(wx)) + this.twoDigit(this.w2ry(wy));
	if ( this.beepersInWorld.hasOwnProperty(key) ) {
	    return ( this.beepersInWorld[key] );
	} else {
	    return 0;
	}
};

// isBeeperAt -- Return true if at least one beeper exists in Karel's world
//               at the given (World) coordinates, else false
karelsim.isBeeperAt = function(wx, wy) {
    "use strict";
	var num;
	num = this.numBeepersAt(wx, wy);
	if ( num > 0 ) {
	    return ( true );
	} else {
	      return ( false );
	}
};

// addWall -- Add a wall at given (World) coordinates of given wall type
karelsim.addWall = function(wx, wy, wallType) {
    "use strict";
    var key;
	key = this.twoDigit(this.w2rx(wx)) + this.twoDigit(this.w2ry(wy));
    this.walls[key] = wallType;
	WORLDSIM.worldController.world.setWall(wx, wy, wallType);  // UI
};

// removeWall -- Remove wall at given (World) coordinates
//               It is legal to "remove" a non-existent wall... means "clear"
karelsim.removeWall = function(wx, wy) {
    "use strict";
    var key;
	key = this.twoDigit(this.w2rx(wx)) + this.twoDigit(this.w2ry(wy));
	delete this.walls[key];
	WORLDSIM.worldController.world.setWall(wx, wy, 0 /* CLEAR */);  // UI
};

// wallTypeAt -- Return type of wall in Karel's world at the given 
//               (World) coordinates. If no wall, returns zero (CLEAR)
// NOTE: Either or both of wx and wy must be x.5, else an intersection!
karelsim.wallTypeAt = function(wx, wy) {
    "use strict";
	var key;
	key = this.twoDigit(this.w2rx(wx)) + this.twoDigit(this.w2ry(wy));
	if ( this.walls.hasOwnProperty(key) ) {
	    return ( this.walls[key] );
	} else {
	    return ( 0 ); // Clear / no wall
	}
};

// isWallAt -- Return true if a wall exists in Karel's world at the given 
//             (World) coordinates
// NOTE: Either or both of wx and wy must be x.5, else an intersection!
karelsim.isWallAt = function(wx, wy) {
    "use strict";
	var wallType;
	
	// Boundaries count as walls
	if ((wy < 1) || (wy > this.maxwy_) ||
	    (wx < 1) || (wx > this.maxwx_)) {
	    return true;
	}
	
	wallType = this.wallTypeAt(wx, wy);
	if ( wallType !== 0 ) {
	    return ( true );
	} else {
	    return ( false );
	}
};



// === ICON-RELATED ===

karelsim.clearActive = function(iconName) {
    if ( ( iconName !== null ) && ( iconName !== '' ) ) {
        document.getElementById(iconName).src = '/images/' + iconName + '.gif';
	}
};

karelsim.setActive = function(iconName) {
    if ( ( iconName !== null ) && ( iconName !== '' ) ) {
        document.getElementById(iconName).src = '/images/' + iconName + '-active.gif';
	}
};

karelsim.rememberActiveIcon = function(iconId) {
    karelsim.activeIconId = iconId;
};

karelsim.getActiveIconId = function() {
    return karelsim.activeIconId;
};

karelsim.clearAllIcons = function() {
    "use strict";
	var ii;
	$(".icon").each(function(index) { karelsim.clearActive($(this).attr("id")); });
	karelsim.rememberActiveIcon("");
};



// === FUNCTIONS TO DISPLAY MESSAGES AND STATUS INFORMATION ===

karelsim.errorMessage = function(msg) {
    karelsim.prependInfo('log', '<span class="error_message">ERROR: ' + msg + '</span>');
};
karelsim.infoMessage = function(msg) {
    karelsim.prependInfo('log', msg);
};



// === EVENT HANDLERS FOR UI ===

// Initialize a new, empty world using the values in the Width and Height drop downs
// as the world's width and height
karelsim.initializeEmptyWorldUsingForm = function() {
    "use strict";
	var width, height;
	width  = $("#width").val();
	height = $("#height").val(); 
	karelsim.initializeEmptyWorld(width, height);
};

karelsim.loadWorldUsingForm = function() {
    "use strict";
	var worldName;
	worldName = $("#worldName").val();
	if ((worldName !== null) && (worldName !== '')) {
	    // Invoke the world function (if user didn't (accidentally) 
		// choose a separator line)
    	world(worldName);
	}
};

// checkSyntaxOnly -- Parse the code in the 'pgm' text area but doesn't run the code
karelsim.checkSyntaxOnly = function() {
    "use strict";
    karelsim.checkSyntax(/*bQuietOnSuccess=*/false);
};

karelsim.resetProgram = function() {
    "use strict";
	var syntaxCheckResult;

    $("#syntaxerror").hide(); // Hide any previous syntax error
    syntaxCheckResult = karelsim.checkSyntax(/*bQuietOnSuccess=*/true);
	if ( syntaxCheckResult !== 0 ) {
	    // Syntax check already gave message(s) about issues... just return here
		return;
	}
	
	// Perform reset...
	jsim.resetProgram();
	
	karelsim.lastProgramReset = karelsim.now();
	$("#btnStepOver").find("img").attr("src", "/images/icon-stepover.gif");
};

karelsim.stepOver = function() {
    "use strict";
	
	if ( karelsim.needReset() ) {
    	alert("Your program has changed since you last reset it to the beginning. " +
		      "Reset your program.");
		return;
	}

	// Perform single step...
	jsim.performStep();
};

karelsim.speedUp = function() {
    "use strict";
	jsim.speedUp(1.1);
};

karelsim.slowDown = function() {
    "use strict";
	jsim.slowDown(1.1);
};

karelsim.togglePause = function() {
    "use strict";
	var isPaused;
	isPaused = jsim.isPaused;
	if ( isPaused ) {
	    // Was paused. We are now unpausing
	    jsim.unPause();
		$("#btnPause").find("img").attr("src", "/images/icon-pause.gif");
		jsim.continueProgram();
	} else {
	    // Was unpaused. We are now pausing
	    jsim.pause();
		$("#btnPause").find("img").attr("src", "/images/icon-pause-active.gif");
	}
};

// runProgram -- Run the JavaScript code in the 'pgm' text area
//               Performs a 'hidden' syntax check if one is needed. Only if
//               errors exist is the fact that a syntax check was performed 
//               revealed. If okay syntax, program is run
karelsim.runProgram = function() {
    "use strict";
	var $taProgram, programSource, syntaxCheckResult, tmpFunc;
	
	$taProgram = $("#pgm");
	programSource = $taProgram.val();
	
	if ( $.trim(programSource) === "" ) {
	    karelsim.infoMessage("There is no program to run.");
	    return;
	}
	
	if ( karelsim.needSyntaxCheck() ) {
    	$("#syntaxerror").hide(); // Hide any previous syntax error
        syntaxCheckResult = karelsim.checkSyntax(/*bQuietOnSuccess=*/true);
		if ( syntaxCheckResult !== 0 ) {
		    // Syntax check already gave message(s) about issues... just return here
			return;
		}
	}

	// Code passed syntax check... run it
	
	// Next two lines would just run the code directly... 
	//     tmpFunc = new Function(programSource);
    //     tmpFunc();
	// We don't do this because we want a simulation so we can step, slow, etc.
	
	try {
    	// Perform post-parse processing (generate steps, primarily)
	    jsim.resetProgram();
	
	    // Kick off the execution... steps will occur via a setInterval()
	    jsim.executeProgram();
	} catch ( ex ) {
        karelsim.errorMessage("An internal error occurred.");
		// TODO: Should really do something a bit nicer...
		console.log("karelsim.runProgram exception:", ex);
	}
};

// runImmediate -- Run the JavaScript code in the 'immed' text area
karelsim.runImmediate = function() {
    "use strict";
    var immedSrc, tmpFunc;
	immedSrc = $.trim($("#immed").val());
	if ((immedSrc !== null) && (immedSrc !== "")) {
    	tmpFunc = new Function(immedSrc);
	    tmpFunc();
	} else {
	    this.infoMessage("No code to run.");
	}
};

// clearLog -- Empty out the message div
karelsim.clearLog = function() {
    karelsim.showInfo('log', '');
};

// handleMouseUp -- Event handler for mouse clicks within Karel's world ("designer mode")
karelsim.handleMouseUp = function(e) {
    "use strict";
    var posx, posy, targ, targetId, targetrx, targetry, targetwx, targetwy,
	    activeIconId, wallNum;
	posx = 0;
	posy = 0;
	if (!e) var e = window.event;
	if (e.pageX || e.pageY) {
	    posx = e.pageX;
	    posy = e.pageY;
	} else if (e.clientX || e.clientY) {
	    posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
	    posy = e.clientY + document.body.scrollTop  + document.documentElement.scrollTop;
	}

	if ( e.target ) {
	    targ = e.target;
	} else if ( e.srcElement ) {
	    targ = e.srcElement;
	}
	// defeat Safari bug
	if ( targ.nodeType == 3 ) {
	    targ = targ.parentNode;
	}

	targetId = targ.id;
	if ( targetId.substr(0, 'cell_'.length) == 'cell_' ) {
	    targetrx = targetId.substr('cell_'.length,    'XX'.length);
	    targetry = targetId.substr('cell_XX_'.length, 'YY'.length);
		
		// Note: These will cause rx's LB, RB, SC and ry's TB, BB, and AR
		//       to all become NaN.
		targetrx = parseInt(targetrx, 10);
		targetry = parseInt(targetry, 10);
		
		targetwx = this.r2wx(targetrx);
		targetwy = this.r2wy(targetry);

		activeIconId = karelsim.getActiveIconId();
		
		if ( activeIconId === '' ) {
		    // Do nothing... no icon is selected as our current 'tool'
		
		// Test for clicks on boundaries (rx: LB, RB, SC; ry: TB, BB, AR)
		} else if ( isNaN(targetrx) || isNaN(targetry) ) {
		    // Do nothing... clicked on a border or the street column or avenue row
		
		} else if ( activeIconId === 'icon-karel' ) {
		    if ( ( targetrx % 2 === 0 ) && ( targetry %2 === 0 ) ) {
			    karelsim.setKarel("on", targetwx, targetwy, "north");
			} else {
			    karelsim.errorMessage("Karel can only be at intersections.");
			}
			
		} else if ( activeIconId === 'icon-beeper' ) {
		    if ( ( targetrx % 2 === 0 ) && ( targetry %2 === 0 ) ) {
			    karelsim.addBeeper(targetwx, targetwy);
			} else {
			    karelsim.errorMessage("Beepers can only be at intersections.");
			}
		
		} else if ( activeIconId === 'icon-clear' ) {
		    // Clearing an intersection means putting a dot down, not a clear image
			if ( ( targetrx % 2 === 0 ) && ( targetry %2 === 0 ) ) {
			    // Intersection...
				// Clear all beepers; but do not "clear" Karel!
				this.removeAllBeepers(targetwx, targetwy);
			} else {
			    // Non-intersection...
				// Clear wall by setting wall type to zero (clear)
				this.addWall(targetwx, targetwy, 0);
		    }
		
		} else if ( activeIconId.indexOf("icon-wall-") !== -1 ) {
		    if ( ( targetrx % 2 !== 0 ) || ( targetry %2 !== 0 ) ) {
			    wallNum = parseInt(activeIconId.substr('icon-wall-'.length), 10);
				this.addWall(targetwx, targetwy, wallNum);
			} else {
			    // Trying to add a wall at an intersection
				karelsim.errorMessage("Walls cannot be at intersections.");
			}
		
		} else {
		    console.log("handleMouseUp: ERROR: Active icon is something (" +
                        activeIconId + ") unexpected. Mouse up event not handled.");
		}
	}
	// Immediately disable after just one click/use (uncomment)
	//karelsim.clearActive(activeIconId);
	//karelsim.rememberActiveIcon('');
};

// icon -- Event handler for mouse clicks on icons in the icon bar
//         Make the current icon 'active' (looking) (possibly doing the reverse if there
//         was a previously active icon) and remember this icon as our active icon
karelsim.icon = function(iconId) {
    var sWorldString, bConfirm, sts;
	
    // Remove active state from currently active icon, if there is one... 
	// goes back to normal
	if ( karelsim.activeIconId != '' ) {
	    karelsim.clearActive(karelsim.activeIconId);
	}
	// Remember the current icon
	karelsim.rememberActiveIcon(iconId);
	
	// Update the current icon to active state
	karelsim.setActive(karelsim.activeIconId);
	
	// Handle export and import buttons directly; others require clicking within world
	if ( karelsim.activeIconId === 'icon-exportworld' ) {
	    sWorldString = karelsim.exportWorldString();
		karelsim.copyToClipboard(sWorldString);
		// Immediately disable after just one click/use
	    karelsim.clearActive(karelsim.activeIconId);
	    karelsim.rememberActiveIcon('');
	} else if ( karelsim.activeIconId === 'icon-importworld' ) {
	    sWorldString = window.prompt("Enter exported world string", "");
		sts = karelsim.importWorldString(sWorldString);
		if ( sts === 0 ) {
	        karelsim.infoMessage("World loaded.");
	    } else {
	        karelsim.errorMessage("World not loaded.");
	    }
		// Immediately disable after just one click/use
	    karelsim.clearActive(karelsim.activeIconId);
	    karelsim.rememberActiveIcon('');
	} else if ( karelsim.activeIconId === 'icon-clearworld' ) {
	    bConfirm = window.confirm("Are you sure you want to clear the world?", null);
		if ( bConfirm ) {
		    karelsim.initializeEmptyWorldUsingCurrentSize();
			karelsim.infoMessage('World cleared.');
		}
		// Immediately disable after just one click/use
	    karelsim.clearActive(karelsim.activeIconId);
	    karelsim.rememberActiveIcon('');
	}
};

// pgmChanged -- Event handler for onkeyup and onblur events on pgm textarea
karelsim.pgmChanged = function() {
    "use strict";
	karelsim.lastProgramEdit = karelsim.now();
	$("#btnStepOver").find("img").attr("src", "/images/icon-stepover-disabled.gif");
};

// grammarChosen -- onChange callback for the drop down list of grammars, selGrammars
//                  Drives which grammar to hand PEG when generating a parser
karelsim.grammarChosen = function() {
    "use strict";
	var $ddGrammar, grammarCode, grammar;
    $ddGrammar = $("#selGrammars");
	grammarCode = $ddGrammar.val();
	grammar = this.getGrammar(grammarCode);
	jsim.setGrammar(grammar);
	karelsim.lastGrammarChosen = karelsim.now();
	$("#btnStepOver").find("img").attr("src", "/images/icon-stepover-disabled.gif");
};

// insertCommand -- onChange callback for the drop down list of commands, selCommands
//                  Will 'type' the selected command into the program ('pgm') text area
//                  'in the right place' based on the cursor location in that text area
karelsim.insertCommand = function() {
    "use strict";
	var sel, cmd;
	sel = document.getElementById('selCommands');
	cmd = sel.options[sel.selectedIndex].value;
	if ( ( cmd != '' ) && ( cmd != '--------------------' ) ) {
	    karelsim.insertAtCaret('pgm', cmd);
	}
};

// keyDown -- Event handler for key presses (for manual movement):
//            Up Arrow=move(), Left Arrow=turnLeft(), Right Arrow=turnRight()

// QQQ
nn=(document.layers)?true:false;
ie=(document.all)?true:false;

karelsim.keyDown = function(e) {
	var evt = (e) ? e : (window.event) ? window.event : null;
	if ( evt ) {
		var key = (evt.charCode) ? 
		          evt.charCode : 
				  ((evt.keyCode) ? evt.keyCode : ((evt.which) ? evt.which : 0));

		var src;
		if (evt.target) {
		    src = evt.target;
		 } else if (evt.srcElement) {
			src = evt.srcElement;
		}
		if (src.nodeType == 3) { src = targ.parentNode; } // defeat Safari bug

		var srcid = '';
		if ( src != null ) { srcid = src.id; }

		if ( srcid != 'pgm' ) {
			if ( key == "38" ) {
			    // Up arrow
			    move();
			} else if ( key == "37" ) {
			    // Left arrow
			    turnLeft();
			} else if ( key == "39" ) {
			    // Right arrow
			    turnRight();
			}
		}
	}
};
// QQQ move to init!!!
document.onkeydown=karelsim.keyDown;
if(nn) document.captureEvents(Event.KEYDOWN);


// Resizing pgm area
karelsim.pgmResize = function(widthFactor, heightFactor) {
    "use strict";
	var $pgm, rows, $linedWrapDiv, width;
	$pgm = $("#pgm");
	if ( widthFactor !== 1 ) {
	    width = $pgm.width();
		width = Math.floor(width * widthFactor);
		if ( width >= 316 ) {
			// Re-jigger our fancy lined text area
			// FRAGILE... Depends on internal implementation of linedtextarea plugin
			// Code below taken from plugin and adopted for use here... 
			// needed for widen/narrow
			$linedWrapDiv = $("#f_pgm .linedwrap");
			$pgm.width(width);
			width = $linedWrapDiv.width();
			width = Math.floor(width * widthFactor);
			$linedWrapDiv.width(width);
		}
	}
	if ( heightFactor !== 1 ) {
	    rows = $pgm.attr("rows");
	    rows = Math.floor(rows * heightFactor);
		if ( rows >= 10 ) {
		    $pgm.attr("rows", rows);
			
			// Re-jigger our fancy lined text area
	        // FRAGILE... Depends on internal implementation of linedtextarea plugin
	        $pgm.trigger("resize");
	        $pgm.trigger("scroll");
		}
	}
};
karelsim.pgmNarrow   = function() { karelsim.pgmResize(0.833, 1); };
karelsim.pgmWiden    = function() { karelsim.pgmResize(1.2, 1); };
karelsim.pgmShorten  = function() { karelsim.pgmResize(1, 0.833); };
karelsim.pgmLengthen = function() { karelsim.pgmResize(1, 1.2); };



// === INITIALIZATION ROUTINES (NEW WORLD + INITIAL PAGE LOAD) ===

karelsim.hideUIElements = function() {
    "use strict";
	// Hide syntax check exclamation point and current line blue arrow 
	$("#syntaxerror").hide();
	$("#currentline").hide();
};

karelsim.prettifyProgramTextArea = function() {
    "use strict";
	// Make 'pgm' textarea into a nicer, numbered, lined text area
	$("#pgm").linedtextarea(
		{selectedLine: 0}
	);
};

karelsim.init = function() {	
	// Initialize jsim
	jsim.init();
	jsim.setDebugLevel(0);
	//*jsim.setDebugLevel(jsim.LOG_ALL);
	//*jsim.setDebugLevel(jsim.LOG_INTERNAL_ERROR + jsim.LOG_UNEXPECTED + jsim.LOG_CALL_RETURN + jsim.LOG_EXEC);
	//jsim.setDebugLevel(jsim.LOG_INTERNAL_ERROR + jsim.LOG_UNEXPECTED + jsim.LOG_CALL_RETURN);
	//jsim.setDebugLevel(jsim.LOG_INTERNAL_ERROR + jsim.LOG_UNEXPECTED);
	jsim.setStepDelay(1000); // Controls playback speed
	jsim.setPreStepCallback(karelsim.jsimPreStep);
	jsim.setEndOfExecutionCallback(karelsim.jsimEndOfExecution);
	
	// Show WORLDSIM-based UI (world and info areas)
	WORLDSIM.worldController.showWorld("#world");       // UI
	WORLDSIM.worldController.showWorldStatus("#info");  // UI
	
	// Timestamps for important internal operations
	lastGrammarChosen     = karelsim.now();
	lastPassedSyntaxCheck = karelsim.now();
    lastProgramEdit       = karelsim.now();
    lastProgramReset      = karelsim.now();
	
	// Drow down of grammars/languages
	karelsim.loadGrammarList();
	// Drop down of commands
	karelsim.loadCommandList(); 
	// Load a sample world
	karelsim.callMethodByName(karelsim, "world_Sample1"); 
	
	// Set default grammar... first/selected grammar in grammars drop down
	karelsim.grammarChosen();
	
	karelsim.prettifyProgramTextArea();
    karelsim.hideUIElements();
	karelsim.addEventListeners();
};

karelsim.loadGrammarList = function() {
    "use strict";
	var sb;
	sb = new karelsim.StringBuilder();
	sb.append('<select id="selGrammars" name="selGrammars" onChange="karelsim.grammarChosen()">\n');
	sb.append('  <option value ="JAVASCRIPT_CORE">JavaScript</option>');
	//TODO: sb.append('  <option value ="KARELSCRIPT_CORE">Original Karel Syntax</option>');
	sb.append('</select>');
	document.getElementById('grammars').innerHTML = sb.toString();
};

karelsim.loadCommandList = function() {
    "use strict";
    var aCommands, numCommands, sb, ii;
	aCommands = new Array();
	numCommands = 0;
	sb = new karelsim.StringBuilder();
	aCommands[numCommands++] = "--------------------";
	aCommands[numCommands++] = "move();";
	aCommands[numCommands++] = "turnLeft();";
	aCommands[numCommands++] = "turnRight();";
	aCommands[numCommands++] = "pickBeeper();";
	aCommands[numCommands++] = "putBeeper();";
	aCommands[numCommands++] = "turnOn();";
	aCommands[numCommands++] = "turnOff();";
	aCommands[numCommands++] = "--------------------";
	aCommands[numCommands++] = "isFacingNorth()";
	aCommands[numCommands++] = "isFacingSouth()";
	aCommands[numCommands++] = "isFacingEast()";
	aCommands[numCommands++] = "isFacingWest()";
    aCommands[numCommands++] = "isNotFacingNorth()";
	aCommands[numCommands++] = "isNotFacingSouth()";
	aCommands[numCommands++] = "isNotFacingEast()";
	aCommands[numCommands++] = "isNotFacingWest()";
	aCommands[numCommands++] = "--------------------";
	aCommands[numCommands++] = "isFrontBlocked()";
	aCommands[numCommands++] = "isLeftBlocked()";
	aCommands[numCommands++] = "isRightBlocked()";
	aCommands[numCommands++] = "isFrontClear()";
	aCommands[numCommands++] = "isLeftClear()";
	aCommands[numCommands++] = "isRightClear()";
	aCommands[numCommands++] = "--------------------";
	aCommands[numCommands++] = "isNextToABeeper()";
	aCommands[numCommands++] = "isNotNextToABeeper()";
	aCommands[numCommands++] = "isAnyBeepersInBeeperBag()";
	aCommands[numCommands++] = "isNoBeepersInBeeperBag()";
	aCommands[numCommands++] = "--------------------";
	aCommands[numCommands++] = "getXPosition()";
	aCommands[numCommands++] = "getYPosition()";
	aCommands[numCommands++] = "getPositionAsString()";
	aCommands[numCommands++] = "getDirection()";
	aCommands[numCommands++] = "getNumBeepersNextTo()";
	aCommands[numCommands++] = "getNumBeepersInWorld()";
	aCommands[numCommands++] = "getNumBeepersInBeeperBag()";
	aCommands[numCommands++] = "getWorldWidth()";
	aCommands[numCommands++] = "getWorldHeight()";
	aCommands[numCommands++] = "--------------------";
	aCommands[numCommands++] = "print();";
	aCommands[numCommands++] = "assert(cond, msg);";
    aCommands[numCommands++] = "--------------------";
	aCommands[numCommands++] = "clearWorld(maxX, maxY);";
	aCommands[numCommands++] = "wall(x, y, direction);";
	aCommands[numCommands++] = "karel(x, y, direction);";
	aCommands[numCommands++] = "beeper(x, y);";

	sb.append('<select id="selCommands" name="selCommands" ');
	sb.append('onChange="karelsim.insertCommand()">\n');
	sb.append('  <option value ="" selected>--Select command to insert--</option>');
	for ( ii = 0; ii < numCommands; ii++ ) {
	  sb.append('  <option value ="' + aCommands[ii] + '" selected">' + 
	            aCommands[ii] + '</option>');
	}
	sb.append('</select>');
	document.getElementById('commands').innerHTML = sb.toString();
};

// Initialize a new, empty world using the existing world's dimensions
// (used by clear world icon)
karelsim.initializeEmptyWorldUsingCurrentSize = function() {
    "use strict";
	var width = karelsim.maxwx_, height = karelsim.maxwy_;
	karelsim.initializeEmptyWorld(width, height);
};

// Initialize a new, empty world using the width (x) and height (y) given
karelsim.initializeEmptyWorld = function(maxwx, maxwy) {
    "use strict";
	var rxx, ryy, wxx, wyy, sb, imgSrc, baseXName, baseYName;
	
	// No can-do
	if ( ( maxwx <= 0 ) || ( maxwy <= 0 ) ) { return; }
	
	// NOTE: We might quietly do something different than asked!
	if ( maxwx > karelsim.MAXMAXWX ) { maxwx = karelsim.MAXMAXWX; }  
	if ( maxwy > karelsim.MAXMAXWY ) { maxwy = karelsim.MAXMAXWY; }

	// Set globals to reflect the state of our new world: 
	// (Karel will go at (1,1) facing north and on + no beepers in world or bag)
	
	WORLDSIM.worldController.createWorld(maxwx, maxwy);  // UI
	this.setMaxwx(maxwx);
	this.setMaxwy(maxwy);
	
	this.setKarel("on", 1, 1, "north");
	this.walls = {};
	this.beepersInWorld = {};
	this.numBeepersInWorld = 0;
	this.numBeepersInKarelsBag = 0;
	
	// Even though not strictly related to the world, make all icons inactive
	karelsim.clearAllIcons();
};



// === EXECUTION-RELATED FUNCTIONS ===

karelsim.needSyntaxCheck = function() {
    "use strict";
	if ( karelsim.lastProgramEdit > karelsim.lastPassedSyntaxCheck ) { return true; }
	if ( karelsim.lastGrammarChosen > karelsim.lastPassedSyntaxCheck ) { return true; }
	return false;
};

karelsim.needReset = function() {
    "use strict";
	if ( karelsim.lastProgramEdit > karelsim.lastProgramReset ) { return true; }
	if ( karelsim.lastGrammarChosen > karelsim.lastProgramReset ) { return true; }
	return false;
};

karelsim.canStep = function() {
    "use strict";
	return ( !karelsim.needReset() );
};

// NOTE: FRAGILE... Depends on HTML layout (location of #syntaxerror 
//       and #currentline) and CSS for #pgm
karelsim.lineNumber2Top = function(lineNumber) {
    return ( 12 + 16*lineNumber );
};

// In the given text area which has the given # pixels per line, place the given
// image at the given line number, scrolling the text area if necessary so given
// line is on the screen
karelsim.positionPointerImage = function($textArea, pixelsPerLine, $image, lineNumber) { 
    "use strict";
	var textAreaHeight, currentScrollTop, newScrollTop, remainder, numLinesShown,
        firstLineShown, lastLineShown, lineNumberOnScreen;
	if ( lineNumber === 0 ) {
	    $textArea.scrollTop(0);
		// Show given image at the right place (css.top value)
		$image.css("top", karelsim.lineNumber2Top(lineNumber)).show();
		return;
	}

	textAreaHeight   = $textArea.height();    // Height in pixels
	currentScrollTop = $textArea.scrollTop(); // Current scrollTop() value in pixels
	
	// Nudge scrollTop to be a value evenly divisible by pixelsPerLine
	remainder = currentScrollTop % pixelsPerLine;
	if ( remainder !== 0 ) {
	    if ( remainder < pixelsPerLine/2 ) {
		    currentScrollTop = currentScrollTop - remainder;
		} else {
		    currentScrollTop = currentScrollTop + pixelsPerLine - remainder;
		}
		$textArea.scrollTop(currentScrollTop);
		// Reality may not actually match what we just tried to do; Use reality
		currentScrollTop = $textArea.scrollTop();
	}
	
	numLinesShown  = Math.round(textAreaHeight / pixelsPerLine);
	firstLineShown = Math.round(currentScrollTop / pixelsPerLine);
	lastLineShown  = firstLineShown + numLinesShown - 1;
	
	if ( ( lineNumber >= firstLineShown ) && ( lineNumber <= lastLineShown ) ) {
	    // Line number is already on screen
		lineNumberOnScreen = lineNumber - firstLineShown;
			
	} else if ( lineNumber >= lastLineShown ) {
	    // Line number is off the screen below what is currently shown... scroll down
		newScrollTop = (lineNumber-3) * pixelsPerLine;
		$textArea.scrollTop(newScrollTop);
		// May not have actually scrolled all the way down (if lines end before 
        // the end of the given text area). Use reality.
		newScrollTop = $textArea.scrollTop();
		firstLineShown = newScrollTop / pixelsPerLine;
		lineNumberOnScreen = lineNumber - firstLineShown;
		
	} else {
	    // Line number is off the screen above what is currently shown... scroll up
		newScrollTop = (lineNumber-3) * pixelsPerLine;
		newScrollTop = (newScrollTop >= 0 ? newScrollTop : 0); // Protection
		$textArea.scrollTop(newScrollTop);
		// May not have actually scrolled all the way up (actually should, but being
		// careful here); Use reality.
		newScrollTop = $textArea.scrollTop();
		firstLineShown = newScrollTop / pixelsPerLine;
		lineNumberOnScreen = lineNumber - firstLineShown;
	}
	// Show current line pointer
	$image.css("top", karelsim.lineNumber2Top(lineNumberOnScreen)).show();
};
	
// checkSyntax -- Parse the code in the 'pgm' text area 
//                bQuietOnSuccess: true means only complain about invalid syntax
//                                 otherwise don't "say" anything
//                                 false means "say" something, even in cases of 
//                                 an empty program body or valid syntax
karelsim.checkSyntax = function(bQuietOnSuccess) {
    "use strict";
    var $pgm, programSource, syntax, msg, lineNumber, pixelsPerLine;

	$("#syntaxerror").hide(); // Any previous syntax error
	$("#currentline").hide(); // In case was visible and now we get a compiler error
	
	$pgm = $("#pgm");
	programSource = $pgm.val();
	
	if ( $.trim(programSource) === "" ) {
	    if ( !bQuietOnSuccess ) {
	        karelsim.infoMessage("There is no program source code to syntax check.");
		}
		karelsim.lastPassedSyntaxCheck = karelsim.now();
		return 0;
	}
	
	try {
	    jsim.setProgramSource(programSource);
	    jsim.parse();
		if ( !bQuietOnSuccess ) {
	        karelsim.infoMessage("Program source code has valid syntax.");
		}
		karelsim.lastPassedSyntaxCheck = karelsim.now();
		return 0;
	} catch ( ex ) {
	    msg = ex.message;
	    karelsim.errorMessage("Could not parse: " + msg);
		lineNumber = ex.parameterValues[1];
		// NOTE: Wish I knew how to set the selectedLine of the textarea
	    // Show exclamation point at line of error
		$pgm = $("#pgm");
		pixelsPerLine = 16;  // NOTE: FRAGILE: Depends on CSS of #pgm
	    karelsim.positionPointerImage($pgm, pixelsPerLine, $("#syntaxerror"), lineNumber);
		return -1;
	}
};

// jsimPreStep -- Callback supplied to jsim. 
//                jsim calls this before executing a step
karelsim.jsimPreStep = function() {
    "use strict";
	var $pgm, lineNumber, pixelsPerLine;
		
	$pgm = $("#pgm");

	lineNumber = jsim.getCurrentLineNumber();          // Current pgm line #
	lineNumber = (lineNumber === -1 ? 0 : lineNumber); // Just in case...

	pixelsPerLine = 16;  // NOTE: FRAGILE: Depends on CSS of #pgm
	karelsim.positionPointerImage($pgm, pixelsPerLine, $("#currentline"), lineNumber);
};

// jsimEndOfExecution -- Callback supplied to jsim. 
//                       jsim calls this when done executing pgm
karelsim.jsimEndOfExecution = function() {
    "use strict";
    karelsim.infoMessage("End of execution.");
};



window.karelsim = karelsim;
return karelsim;

});
