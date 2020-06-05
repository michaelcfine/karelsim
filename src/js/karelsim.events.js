// karelsim.impexp.js
//
// Karel the Robot simulator, using JavaScript as the programming language
// Based on "Karel the Robot" by Richard E. Pattis and revised by
// Jim Roberts and Mark Stehlik
//
// This file contains code related to event handling
//
// Created: 12/15/2012
//      by: Mike Fine (michaelcfine@gmail.com)
//

define(
["karelsim"],
function(karelsim) {

karelsim.addEventListeners = function() {
    "use strict";
    var arrEventListeners, ii, len, evlis;
	
	arrEventListeners = [
	    { sel: "#btnInitializeEmptyWorldUsingForm", evt: "click"  , fcn: function() { karelsim.initializeEmptyWorldUsingForm(); return false; } },
		{ sel: "#btnLoadWorldUsingForm"           , evt: "click"  , fcn: function() { karelsim.loadWorldUsingForm();            return false; } },
		
		{ sel: "#btnResetKarel"                   , evt: "click"  , fcn: function() { karel(1,1,"north"); return false; } },
		{ sel: "#btnTurnOn"                       , evt: "click"  , fcn: function() { turnOn();           return false; } },
		{ sel: "#btnTurnOff"                      , evt: "click"  , fcn: function() { turnOff();          return false; } },
		{ sel: "#btnMove"                         , evt: "click"  , fcn: function() { move();             return false; } },
		{ sel: "#btnTurnLeft"                     , evt: "click"  , fcn: function() { turnLeft();         return false; } },
		{ sel: "#btnTurnRight"                    , evt: "click"  , fcn: function() { turnRight();        return false; } },
		{ sel: "#btnPickBeeper"                   , evt: "click"  , fcn: function() { pickBeeper();       return false; } },
		{ sel: "#btnPutBeeper"                    , evt: "click"  , fcn: function() { putBeeper();        return false; } },
		
		{ sel: "#btnCheckSyntaxOnly"              , evt: "click"  , fcn: function() { karelsim.checkSyntaxOnly(); return false; } },
		{ sel: "#btnResetProgram"                 , evt: "click"  , fcn: function() { karelsim.resetProgram();    return false; } },
		{ sel: "#btnStepOver"                     , evt: "click"  , fcn: function() { karelsim.stepOver();        return false; } },
		{ sel: "#btnSpeedUp"                      , evt: "click"  , fcn: function() { karelsim.speedUp();         return false; } },
		{ sel: "#btnSlowDown"                     , evt: "click"  , fcn: function() { karelsim.slowDown();        return false; } },
		{ sel: "#btnPause"                        , evt: "click"  , fcn: function() { karelsim.togglePause();     return false; } },
		{ sel: "#btnRunProgram"                   , evt: "click"  , fcn: function() { karelsim.runProgram();      return false; } },
		
		{ sel: "#btnRunImmediate"                 , evt: "click"  , fcn: function() { karelsim.runImmediate(); return false; } },
		{ sel: "#btnClearLog"                     , evt: "click"  , fcn: function() { karelsim.clearLog();     return false; } },
		
		{ sel: "#btnNarrow"                       , evt: "click"  , fcn: function() { karelsim.pgmNarrow();   return false; } },
		{ sel: "#btnWiden"                        , evt: "click"  , fcn: function() { karelsim.pgmWiden();    return false; } },
		{ sel: "#btnShorten"                      , evt: "click"  , fcn: function() { karelsim.pgmShorten();  return false; } },
		{ sel: "#btnLengthen"                     , evt: "click"  , fcn: function() { karelsim.pgmLengthen(); return false; } },
		
		{ sel: "#btnIconClearWorld"               , evt: "click"  , fcn: function() { karelsim.icon("icon-clearworld");  return false; } },
		{ sel: "#btnIconKarel"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-karel");       return false; } },
        { sel: "#btnIconBeeper"                   , evt: "click"  , fcn: function() { karelsim.icon("icon-beeper");      return false; } },
		{ sel: "#btnIconClear"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-clear");       return false; } },
		{ sel: "#btnIconWall10"                   , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-10");     return false; } },
		{ sel: "#btnIconWall5"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-5");      return false; } },
		{ sel: "#btnIconWall9"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-9");      return false; } },
        { sel: "#btnIconWall12"                   , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-12");     return false; } },
		{ sel: "#btnIconWall3"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-3");      return false; } },
		{ sel: "#btnIconWall6"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-6");      return false; } },
		{ sel: "#btnIconWall15"                   , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-15");     return false; } },
		{ sel: "#btnIconWall8"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-8");      return false; } },
		{ sel: "#btnIconWall4"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-4");      return false; } },
		{ sel: "#btnIconWall2"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-2");      return false; } },
		{ sel: "#btnIconWall1"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-1");      return false; } },
        { sel: "#btnIconWall13"                   , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-13");     return false; } },
		{ sel: "#btnIconWall7"                    , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-7");      return false; } },
		{ sel: "#btnIconWall11"                   , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-11");     return false; } },
		{ sel: "#btnIconWall14"                   , evt: "click"  , fcn: function() { karelsim.icon("icon-wall-14");     return false; } },
		{ sel: "#btnIconExportWorld"              , evt: "click"  , fcn: function() { karelsim.icon("icon-exportworld"); return false; } },
        { sel: "#btnIconImportWorld"              , evt: "click"  , fcn: function() { karelsim.icon("icon-importworld"); return false; } },
		
		{ sel: "#world"                           , evt: "mouseup", fcn: function() { karelsim.handleMouseUp(event); return false; } },
		{ sel: "#pgm"                             , evt: "keyup"  , fcn: function() { karelsim.pgmChanged();         return false; } },
		{ sel: "#pgm"                             , evt: "blur"   , fcn: function() { karelsim.pgmChanged();         return false; } }
	];
	for ( ii = 0, len = arrEventListeners.length; ii < len; ii += 1 ) {
	    evlis = arrEventListeners[ii];
	    $(evlis.sel).bind(evlis.evt, evlis.fcn);
	}
};

return karelsim;

});
