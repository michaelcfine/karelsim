// karelsim.impexp.js
//
// Karel the Robot simulator, using JavaScript as the programming language
// Based on "Karel the Robot" by Richard E. Pattis and revised by
// Jim Roberts and Mark Stehlik
//
// This file contains the code related to import/export of world definitions
//
// Created: 12/15/2012
//      by: Mike Fine (michaelcfine@gmail.com)
//

define(
["karelsim"],
function(karelsim) {

// === World Import/Export ===

karelsim.wallType2WallTypeHex = function(wallType) {
    "use strict";
	var hex = "0123456789ABCDEF";
	return hex.charAt(wallType);
};

karelsim.wallTypeHex2WallType = function(wallTypeHex) {
    "use strict";
	var hex = "0123456789ABCDEF";
	return hex.indexOf(wallTypeHex);
};

karelsim.wallTypeHex2Letter = function(wallTypeHex) {
    "use strict";
    switch (wallTypeHex) {
	case "0": return '_';  /* Clear */
	case "1": return 'L';  /* Left */
	case "2": return 'B';  /* Bottom */
	case "3": return '>';  /* Bottom Left Corner */
	case "4": return 'R';  /* Right */
	case "5": return '-';  /* Left and Right */
	case "6": return '<';  /* Bottom Right Corner */
	case "7": return 't';  /* Left, Right, Bottom */
	case "8": return 'T';  /* Top */
	case "9": return '/';  /* Top Left Corner */
	case "A": return '|';  /* Top and Bottom */
	case "B": return 'r';  /* Top, Bottom, Left */
	case "C": return '~';  /* Top Right Corner */
	case "D": return 'b';  /* Left, Right, Top */
	case "E": return 'l';  /* Top, Bottom, Right */
	case "F": return '+';  /* Wall Intersection */
	default: return '?';
	}
};

karelsim.letter2WallTypeHex = function(letter) {
    "use strict";
    switch (letter) {
	case '_':  return "0"; /* Clear */
	case 'L':  return "1"; /* Left */
	case 'B':  return "2"; /* Bottom */
	case '>':  return "3"; /* Bottom Left Corner */
	case 'R':  return "4"; /* Right */
	case '-':  return "5"; /* Left and Right */
	case '<':  return "6"; /* Bottom Right Corner */
	case 't':  return "7"; /* Left, Right, Bottom */
	case 'T':  return "8"; /* Top */
	case '/':  return "9"; /* Top Left Corner */
	case '|':  return "A"; /* Top and Bottom */
	case 'r':  return "B"; /* Top, Bottom, Left */
	case '~':  return "C"; /* Top Right Corner */
	case 'b':  return "D"; /* Left, Right, Top */
	case 'l':  return "E"; /* Top, Bottom, Right */
	case '+':  return "F"; /* Wall Intersection */
	default: return '?';
	}
};

karelsim.exportWorldString = function() {
    var sb, rx, ry, wx, wy, baseImage, dir, ss, wallType, wallTypeHex;
    sb = new this.StringBuilder();
	sb.append("[");                // Starting bracket
	sb.append("1");                // Version number of encoding
	sb.append(";");                // Separator
	sb.append(this.maxwx_);        // X-size in Karel's world coordinates
	sb.append(";");                // Separator
	sb.append(this.maxwy_);        // Y-size in Karel's world coordinates
	sb.append(";");                // Separator
	sb.append(this.karelwx);       // Karel's x-coordinate in Karel's world coordinates
	sb.append(";");                // Separator
	sb.append(this.karelwy);       // Karel's y-coordinate in Karel's world coordinates
	sb.append(";");                // Separator
	sb.append(this.karelDir);      // Karel's y-coordinate in Karel's world coordinates
	sb.append(";");
	for ( ry = 0; ry < this.maxry_ - 1; ry += 1 ) {
	    wy = this.r2wy(ry);
        for ( rx = 0; rx < this.maxrx_ - 1; rx += 1 ) {
		    wx = this.r2wx(rx);
		    if ( ( rx % 2 === 0 ) && ( ry %2 === 0 ) ) {
			    // Intersection
				// NOTE: Single char approach means if > 9 beepers at loc
				//       we'll have bomb city / strange results on import!
				sb.append(this.numBeepersAt(wx, wy).toString());
			} else {
			    // Wall spaces between intersections
				wallType = this.wallTypeAt(wx, wy);
				wallTypeHex = this.wallType2WallTypeHex(wallType);
			    sb.append(this.wallTypeHex2Letter(wallTypeHex));
			}
        }
		if ( ( rx !== this.maxrx_ - 2 ) && ( ry !== this.maxry_ - 2 ) ) {
            sb.append(";"); // Separator, but not at very end right before closing bracket
		}
    }
	sb.append("]"); // Ending bracket
	return sb.toString();
};

karelsim.importWorldString = function(sWorldString) {
    "use strict";
    var len, pos, semi1, semi2, width, height, karelx, karely, direction, 
	    rowString, rowStrings, numChars, letter, rx, ry, wx, wy, numBeepers, ii,
		wallTypeHex, wallType;
	try {
		len = sWorldString.length;
		if ( sWorldString.substr(0, 1) !== "[" )     {
		    this.errorMessage('Invalid world string (1).');
			return;
		}
		if ( sWorldString.substr(len-1, 1) !== "]" ) {
		    this.errorMessage('Invalid world string (2).');
			return;
		}
		if ( sWorldString.substr(1, 1) !== "1" ) {
		    this.errorMessage('Invalid world string (3).');
			return;
		}
		
		semi1 = sWorldString.indexOf(";", 2); // Semicolon past version number
		semi2 = sWorldString.indexOf(";", semi1+1);
		width = parseInt(sWorldString.substring(semi1+1, semi2), 10);
		
		semi1 = semi2;
		semi2 = sWorldString.indexOf(";", semi1+1);
		height = parseInt(sWorldString.substring(semi1+1, semi2), 10);
		
		semi1 = semi2;
		semi2 = sWorldString.indexOf(";", semi1+1);
		karelx = parseInt(sWorldString.substring(semi1+1, semi2), 10);
		
		semi1 = semi2;
		semi2 = sWorldString.indexOf(";", semi1+1);
		karely = parseInt(sWorldString.substring(semi1+1, semi2), 10);
		
		semi1 = semi2;
		semi2 = sWorldString.indexOf(";", semi1+1);
		direction = sWorldString.substring(semi1+1, semi2);
		
		try {
			rowStrings = [];
			for ( ry = 0; ry < 2*height - 1; ry += 1 ) {
				semi1 = semi2;
				if ( ry !== 2*height - 2 ) {
					semi2 = sWorldString.indexOf(";", semi1+1);
				} else {
					semi2 = sWorldString.indexOf("]", semi1+1);
				}
				rowString = sWorldString.substring(semi1+1, semi2);
				//console.log(ry, rowString, rowString.length, 2*width - 1);
				if ( rowString.length !== 2*width - 1 ) {
					throw "INVALID_ROW_STRING";
				}
				rowStrings.push(rowString);
			}
		} catch ( ex ) {
	        this.errorMessage('Invalid world string (9). World not loaded.');
			this.errorMessage(JSON.stringify(ex));
			throw("ERROR");
	    }
		
		// If we got here, we had a well-formed world string... do the actual work
		
		// Create the world
		this.initializeEmptyWorld(width, height);
		
		// Fill the icon images based on our rowStrings
		for ( ry = 0, len = rowStrings.length; ry < len; ry += 1 ) {
		    wy = this.r2wy(ry);
		    rowString = rowStrings[ry];
			//console.log("rowString[ry=" + ry + "]=#" + rowString + "#");
		    for ( rx = 0, numChars = rowString.length; rx < numChars; rx += 1 ) {
			    wx = this.r2wx(rx);
			    letter = rowString.charAt(rx);
				//console.log(rx, ry, wx, wy, letter, ( ( rx % 2 === 0 ) && ( ry %2 === 0 ) ) ? "intersection" : "wallspace");
				if ( ( rx % 2 === 0 ) && ( ry %2 === 0 ) ) {
				    // Intersection
					// Support for when periods were used for empty intersections
					if ( letter === "." ) {
					    numBeepers = 0;
					} else {
    					numBeepers = parseInt(letter, 10);
					}
					for ( ii = 0; ii < numBeepers; ii += 1 ) {
					    this.addBeeper(wx, wy);
					}
				} else {
				    // Wall space between intersections
					wallTypeHex = this.letter2WallTypeHex(letter);
					wallType = this.wallTypeHex2WallType(wallTypeHex);	
					this.addWall(wx, wy, wallType);
				}
			}
        }
		
		// Place Karel
		karelsim.setKarel("on", karelx, karely, direction);
		
		// All done
		karelsim.infoMessage("World loaded.");
		return 0;
	} catch ( ex ) {
	    karelsim.errorMessage("World not loaded.");
	    return -1;
	}
};

return karelsim;

});
