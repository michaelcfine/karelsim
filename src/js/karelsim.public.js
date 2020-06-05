// karelsim.public.js
//
// Karel the Robot simulator, using JavaScript as the programming language
// Based on "Karel the Robot" by Richard E. Pattis and revised by
// Jim Roberts and Mark Stehlik
//
// This file contains the code related to the "public JavaScript API"
// for the simulator. E.g., window/global functions for move(), turnLeft(), etc.
//
// ---------------------------------------------------------------------
// "PUBLIC" FUNCTIONS
// ---------------------------------------------------------------------
//     World Construction
//     ~~~~~~~~~~~~~~~~~~
//     clearWorld
//     wall
//     karel
//     beeper
//     setNumBeepersInKarelsBag
//
//     Worlds Loading
//     ~~~~~~~~~~~~~~
//     world       -- Load world by executing the given JS method name on karelsim
//     worldString -- Load world by using given string created by exporting a world
//
//     Conditions / Information
//     ~~~~~~~~~~~~~~~~~~~~~~~~
//     isFacingNorth, etc. (4)
//     isNotFacingNorth, etc. (4)
//     isFrontBlocked, isLeftBlocked, isRightBlocked
//     isFrontClear, isLeftClear, isRightClear
//     isNextToABeeper, isNotNextToABeeper
//     isAnyBeepersInBeeperBag
//     isNoBeepersInBeeperBag
//     getXPosition, getYPosition, getPositionAsString, getDirection 
//     getNumBeepersNextTo, getNumBeepersInWorld, getNumBeepersInBeeperBag
//     getWorldWidth, getWorldHeight
//
//     Actions
//     ~~~~~~~
//     move
//     turnLeft, turnRight
//     pickBeeper, putBeeper
//     turnOn, turnOff
//
//     Miscellaneous
//     ~~~~~~~~~~~~~
//     print, assert
// ---------------------------------------------------------------------
//
// Created: 12/15/2012
//      by: Mike Fine (michaelcfine@gmail.com)
//

define(
["karelsim", "worldsim"],
function(karelsim, WORLDSIM) {

// ----- WORLD CONSTRUCTION -----
// These functions are for use within world construction functions

function clearWorld(maxwx, maxwy)    { karelsim.initializeEmptyWorld(maxwx, maxwy); }
function wall(wx, wy, direction)     { karelsim.addWall(wx, wy, direction); }
function karel(wx, wy, direction)    { karelsim.setKarel("on", wx, wy, direction); }
function beeper(wx, wy)              { karelsim.addBeeper(wx, wy); }
function setNumBeepersInKarelsBag(n) { karelsim.setNumBeepersInKarelsBag(n); }

// ----- WORLD LOADING -----

// worldName is the name of a JS method on karelsim that will be executed
function world(worldName) {
    "use strict";
    var sts = karelsim.callMethodByName(karelsim, worldName);
	if ( sts === 0 ) {
	    karelsim.infoMessage("World loaded.");
	} else {
	    karelsim.errorMessage("World not loaded.");
	}
	return sts;
}

// worldString is a string created by the world export process
function worldString(worldString) {
    "use strict";
    var sts = karelsim.importWorldString(worldString);
	return sts;
}

// ----- CONDITIONS / INFORMATION -----
// Note: As implemented, these informational functions are available even when
//       Karel is off. This was done to keep these functions short and sweet.

function isFacingNorth() { return ( karelsim.karelDir === 'north' ) }
function isFacingEast()  { return ( karelsim.karelDir === 'east'  ) }
function isFacingSouth() { return ( karelsim.karelDir === 'south' ) }
function isFacingWest()  { return ( karelsim.karelDir === 'west'  ) }

function isNotFacingNorth() { return ( ! isFacingNorth() ); } 
function isNotFacingEast()  { return ( ! isFacingEast()  ); }
function isNotFacingSouth() { return ( ! isFacingSouth() ); }
function isNotFacingWest()  { return ( ! isFacingWest()  ); }

function isFrontBlocked() {
    return ( karelsim.isWallAt(karelsim.karelwx+karelsim.XDELTA[karelsim.karelDir]/2,
                               karelsim.karelwy+karelsim.YDELTA[karelsim.karelDir]/2) );
}
function isLeftBlocked() {
    return ( karelsim.isWallAt(karelsim.karelwx+karelsim.XDELTA[karelsim.LEFTTURN [karelsim.karelDir]]/2,
             karelsim.karelwy+karelsim.YDELTA[karelsim.LEFTTURN [karelsim.karelDir]]/2) );
}
function isRightBlocked() {
    return ( karelsim.isWallAt(karelsim.karelwx+karelsim.XDELTA[karelsim.RIGHTTURN[karelsim.karelDir]]/2,
             karelsim.karelwy+karelsim.YDELTA[karelsim.RIGHTTURN[karelsim.karelDir]]/2) );
}

function isFrontClear() { return ( ! isFrontBlocked() ); }
function isLeftClear()  { return ( ! isLeftBlocked()  ); }
function isRightClear() { return ( ! isRightBlocked() ); }

function isNextToABeeper()    { return ( karelsim.isBeeperAt(karelsim.karelwx, karelsim.karelwy) ); }
function isNotNextToABeeper() { return ( ! isNextToABeeper() ); }

function isAnyBeepersInBeeperBag()    { return ( karelsim.numBeepersInKarelsBag > 0  ); }
function isNoBeepersInBeeperBag()     { return ( karelsim.numBeepersInKarelsBag <= 0 ); }

function getXPosition() { return karelsim.karelwx; }
function getYPosition() { return karelsim.karelwy; }
function getPositionAsString() { return "(" + karelsim.karelwx + "," + karelsim.karelwy + ")"; }
function getDirection() { return karelsim.karelDir; }
function getNumBeepersNextTo() { return karelsim.numBeepersAt(karelsim.karelwx, karelsim.karelwy); }
function getNumBeepersInWorld() { return ( karelsim.numBeepersInWorld ); }
function getNumBeepersInBeeperBag() { return ( karelsim.numBeepersInKarelsBag ); }

function getWorldWidth()  { return karelsim.maxwx_; }
function getWorldHeight() { return karelsim.maxwy_; }

// ----- COMMANDS -----

// move -- Move Karel forward one intersection
//         Error conditions:
//           1. Karel is not on
//           2. Karel would crash into a wall or boundary if he moved
function move() {
    "use strict";
	if ( karelsim.karelStatus !== 'on' ) {
	    karelsim.errorMessage('Karel cannot move when he is off.');
		karelsim.errorTurnOff();
	} else if ( ! ( karelsim.isWallAt(karelsim.karelwx+karelsim.XDELTA[karelsim.karelDir]/2, 
	                karelsim.karelwy+karelsim.YDELTA[karelsim.karelDir]/2) ) ) {
	    karelsim.setKarelPosition(karelsim.karelwx+karelsim.XDELTA[karelsim.karelDir], 
		                          karelsim.karelwy+karelsim.YDELTA[karelsim.karelDir]);
	    karelsim.infoMessage('Karel moved forward');
	} else {
	    karelsim.errorMessage('CRASH!');
	    karelsim.errorTurnOff();
	}
}

// turnLeft -- Turn Karel 90 degrees counterclockwise
function turnLeft() {
    "use strict";
	if ( karelsim.karelStatus === 'on' ) {
    	karelsim.setKarelDirection(karelsim.LEFTTURN[karelsim.karelDir]);
	    karelsim.infoMessage('Karel turned left');
	} else {
	    karelsim.errorMessage('Karel cannot turn left when he is off.');
		karelsim.errorTurnOff();
	}
}

// turnRight -- Turn Karel 90 degrees clockwise
function turnRight() {
    "use strict";
	if ( karelsim.karelStatus === 'on' ) {
    	karelsim.setKarelDirection(karelsim.RIGHTTURN[karelsim.karelDir]);
	    karelsim.infoMessage('Karel turned right');
	} else {
	    karelsim.errorMessage('Karel cannot turn right when he is off.');
		karelsim.errorTurnOff();
	}
}

// pickBeeper -- Pick up a beeper from Karel's current location
//              Error conditions:
//                1. Karel is not on
//                2. No beeper exists at Karel's location
function pickBeeper() { 
    "use strict";
	if ( karelsim.karelStatus !== 'on' ) {
	    karelsim.errorMessage('Karel cannot pick up a beeper when he is off.');
		karelsim.errorTurnOff();
	} else if ( isNotNextToABeeper() ) {
	    karelsim.errorMessage('No beeper to pick up.');
	    karelsim.errorTurnOff();
	} else {
	    karelsim.removeBeeper(karelsim.karelwx, karelsim.karelwy);
		karelsim.increaseNumBeepersInKarelsBag();
	    karelsim.infoMessage('A beeper has been picked up');
	}
}

// putBeeper -- Put down a beeper at Karel's current location
//              Error conditions:
//                1. Karel is not on
//                2. A beeper already exists at Karel's location
//                3. Karel does not have any beepers in his beeper bag
function putBeeper() {
    "use strict";
	if ( karelsim.karelStatus !== 'on' ) {
	    karelsim.errorMessage('Karel cannot put down a beeper when he is off.');
		karelsim.errorTurnOff();
	} else if ( isNoBeepersInBeeperBag() ) {
	    karelsim.errorMessage('No beeper to put down.');
	    karelsim.errorTurnOff();
	} else {
	    karelsim.addBeeper(karelsim.karelwx, karelsim.karelwy);
	    karelsim.decreaseNumBeepersInKarelsBag();
	    karelsim.infoMessage('A beeper has been put down.');
	}
}

// turnOn -- Turn Karel on
//           Error conditions:
//             1. Karel is already on
function turnOn() {
    "use strict"; 
	if ( karelsim.karelStatus !== 'off' ) {
    	karelsim.errorMessage('Karel is already on.');
		karelsim.errorTurnOff();
    } else {
		karelsim.setKarelStatus('on');
		WORLDSIM.worldController.world.karel.turnOn();  // UI
	}
}

// turnOff -- Turn Karel off
//            Error conditions:
//              1. Karel is already off
function turnOff() {
    "use strict";
	if ( karelsim.karelStatus !== 'on' ) {
    	karelsim.errorMessage('Karel is already off.');
		karelsim.errorTurnOff();
	} else {
	    karelsim.setKarelStatus('off');
		WORLDSIM.worldController.world.karel.turnOff();  // UI
	}
}

// ----- MISCELLANEOUS -----

// print -- Print message to message area / "console" within page
function print(msg) {
    "use strict";
	karelsim.infoMessage(msg);
}

// log -- Synonym for print()
function log(msg) {
    "use strict";
	print(msg);
}

// assert -- Assert that first condition is true. If not print() the second parameter (message)
function assert(cond, msg) {
    if ( ! cond ) {
	    karelsim.errorMessage('ASSERTION FAILED: ' + msg);
	}
}

window.clearWorld = clearWorld;
window.wall = wall;
window.karel = karel;
window.beeper = beeper;
window.setNumBeepersInKarelsBag = setNumBeepersInKarelsBag;
window.world = world;
window.worldString = worldString;
window.isFacingNorth = isFacingNorth;
window.isFacingEast = isFacingEast;
window.isFacingSouth = isFacingSouth;
window.isFacingWest = isFacingWest;
window.isNotFacingNorth = isNotFacingNorth;
window.isNotFacingEast = isNotFacingEast;
window.isNotFacingSouth = isNotFacingSouth;
window.isNotFacingWest = isNotFacingWest;
window.isFrontBlocked = isFrontBlocked;
window.isLeftBlocked = isLeftBlocked;
window.isRightBlocked = isRightBlocked;
window.isFrontClear = isFrontClear;
window.isLeftClear = isLeftClear;
window.isRightClear = isRightClear;
window.isNextToABeeper = isNextToABeeper;
window.isNotNextToABeeper = isNotNextToABeeper;
window.isAnyBeepersInBeeperBag = isAnyBeepersInBeeperBag;
window.isNoBeepersInBeeperBag = isNoBeepersInBeeperBag;
window.getXPosition = getXPosition;
window.getYPosition = getYPosition;
window.getPositionAsString = getPositionAsString;
window.getDirection = getDirection;
window.getNumBeepersNextTo = getNumBeepersNextTo;
window.getNumBeepersInWorld = getNumBeepersInWorld;
window.getNumBeepersInBeeperBag = getNumBeepersInBeeperBag;
window.getWorldWidth = getWorldWidth;
window.getWorldHeight = getWorldHeight;
window.move = move;
window.turnLeft = turnLeft;
window.turnRight = turnRight;
window.pickBeeper = pickBeeper;
window.putBeeper = putBeeper;
window.turnOn = turnOn;
window.turnOff = turnOff;
window.print = print;
window.log = log;
window.assert = assert;

return karelsim;

});
