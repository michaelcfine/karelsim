// worldsim.karelsim.js
//
// Created: 12/15/2012
//      by: Mike Fine (michaelcfine@gmail.com)
//
// OVERVIEW
// ~~~~~~~~
// WORLDSIM plugin for Karel the Robot simulator, karelsim
// Includes support for Things: Karel, Beeper, Wall
//

define(
["EmberModule", "worldsim"],
function(Ember, WORLDSIM) {
		
	// ---------- MODELS: New WORLDSIM Thing subclasses ----------
	
	// ----- Karel -----
	
	WORLDSIM.Karel = WORLDSIM.Thing.extend({
		status:    null,
		direction: null,
		numBeepersInBag: 0,

		isKarel: function() { return true; },
	
		imgSrc: function() {
		    "use strict";
			var status, direction;
			status = this.get("status");
			direction = this.get("direction");
			return "/images/karel-" + status + "-" + direction + ".gif";
		} .property("status", "direction").cacheable(),

		isOn: function() {
			"use strict";
			var status;
			status = this.get("status");
			return (status === "on");
		} .property("status").cacheable(),

		isOff: function() {
			"use strict";
			var status;
			status = this.get("status");
			return (status !== "on");
		} .property("status").cacheable(),

		setLocation: function(wx, wy) {
		    "use strict";
			var world = this.get("world");
			this.set("rx", world.w2rx(wx));
			this.set("ry", world.w2ry(wy));
		},

		setStatus: function(status) {
		    "use strict";
			this.set("status", status);
		},

		turnOn: function() {
			"use strict";
			this.set("status", "on");
		},

		turnOff: function() {
			"use strict";
			this.set("status", "off");
		},

		setDirection: function(direction) {
			"use strict";
			this.set("direction", direction);
		},
		
		setNumBeepersInBag: function(numBeepers) {
		    "use strict";
			this.set("numBeepersInBag", numBeepers);
		},
		
		addBeeperToBag: function() {
		    "use strict";
			var numBeepersInBag = this.get("numBeepersInBag");
			this.set("numBeepersInBag", numBeepersInBag + 1);
		},
		
		removeBeeperFromBag: function() {
		    "use strict";
			var numBeepersInBag = this.get("numBeepersInBag");
			this.set("numBeepersInBag", numBeepersInBag - 1);
		}
	});
	
	WORLDSIM.Karel.reopenClass({
		createKarel: function(world, status, wx, wy, direction) {
			"use strict";
			var rx, ry, karel;
			
			karel = world.get("karel");
			if ( karel !== null ) {
			    // Karel has already been created... update
				karel.setStatus(status);
				karel.setLocation(wx, wy);
				karel.setDirection(direction);
			} else {
			    // Karel has not yet been created... create
    			rx = world.w2rx(wx);
			    ry = world.w2ry(wy);
			
			    karel = WORLDSIM.Karel.create({
			        world: world,
				    type: "KAREL",
			   	    rx: rx,
				    ry: ry,
				    status: status,
				    direction: direction
			    });
			}
			return karel;
		}
	});
	
	// ----- Beeper -----
	
	WORLDSIM.Beeper = WORLDSIM.Thing.extend({
	    isBeeper: function() { return true; },
		
	    imgSrc: function() {
		    "use strict";
			return "/images/beeper.gif";
		} .property().cacheable(),
	});

	WORLDSIM.Beeper.reopenClass({
		createBeeper: function (world, wx, wy) {
			"use strict";
			var rx, ry, beeper;

			rx = world.w2rx(wx);
			ry = world.w2ry(wy);

			beeper = WORLDSIM.Beeper.create({
			    world: world,
				type: "BEEPER",
				rx: rx,
				ry: ry
			});

			return beeper;
		}
	});
	
	// ----- Wall -----
	
	WORLDSIM.Wall = WORLDSIM.Thing.extend({
		wallType: null,
		
		isWall: function() { return true; },
		
		imgSrc: function() {
		    "use strict";
			var wallType;
			wallType = this.get("wallType");
			return "/images/wall-" + wallType + ".gif";
		} .property("wallType").cacheable(),
	});

	WORLDSIM.Wall.reopenClass({
		createWall: function (world, wx, wy, wallType) {
			"use strict";
			var rx, ry, wall;

			rx = world.w2rx(wx);
			ry = world.w2ry(wy);

			wall = WORLDSIM.Wall.create({
			    world: world,
				type: "WALL",
				rx: rx,
				ry: ry,
				wallType: wallType
			});

			return wall;
		},
		
		WALLTYPE_CLEAR:              0,
		WALLTYPE_LEFT:               1,
		WALLTYPE_BOTTOM:             2,
		WALLTYPE_LEFT_BOTTOM:        3,
		WALLTYPE_RIGHT:              4,
		WALLTYPE_LEFT_RIGHT:         5,
		WALLTYPE_RIGHT_BOTTOM:       6,
		WALLTYPE_LEFT_RIGHT_BOTTOM:  7,
		WALLTYPE_TOP:                8,
		WALLTYPE_LEFT_TOP:           9,
		WALLTYPE_TOP_BOTTOM:        10,
		WALLTYPE_LEFT_TOP_BOTTOM:   11,
		WALLTYPE_TOP_RIGHT:         12,
		WALLTYPE_LEFT_RIGHT_TOP:    13,
		WALLTYPE_RIGHT_TOP_BOTTOM:  14,
		WALLTYPE_ALL:               15
	});
	
	// ---------- MODELS: Extensions to Core WORLDSIM Classes ----------
	
	// ----- Intersection -----

	WORLDSIM.Intersection.reopen({
	    hasKarel: function() {
		    "use strict";
			var karel;
			karel = this.get("world").get("karel");
			if ( karel === null ) { return false; }
			return ((this.get("rx") === karel.get("rx")) &&
			        (this.get("ry") === karel.get("ry")));
		} .property("rx", "ry",
		            "world", "world.karel",
                    "world.karel.rx", "world.karel.ry",
					"WORLDSIM.worldController",
					"WORLDSIM.worldController.world",
					"WORLDSIM.worldController.world.karel",
					"WORLDSIM.worldController.world.karel.rx",
					"WORLDSIM.worldController.world.karel.ry").cacheable(),
		
		// Pseudo property so template can do ...intersection.karel
		// (but only if intersection.hasKarel is true)
		karel: function() {
		    "use strict";
			var hasKarel, karel;
			hasKarel = this.get("hasKarel");
			if ( hasKarel ) {
			    return this.get("world").get("karel");
			} else {
			    return null;
			}
		} .property("hasKarel", "world", "world.karel",
		            "WORLDSIM.worldController",
					"WORLDSIM.worldController.world",
					"WORLDSIM.worldController.world.karel").cacheable(),

		numBeepers: function() {
		    "use strict";
			var things, cnt, ii, len;
			things = this.get("things");
			cnt = 0;
			for ( ii = 0, len = things.length; ii < len; ii += 1 ) {
			    if ( things[ii].get("type") === "BEEPER" ) {
				    cnt += 1;
				}
			}
			return cnt;
		} .property("things", "things.@each", "things.@each.type").cacheable(),
		
		hasAtLeastOneBeeper: function() {
		    "use strict";
			var numBeepers = this.get("numBeepers");
			return numBeepers > 0;
		} .property("numBeepers").cacheable(),

		hasMoreThanOneBeeper: function() {
		    "use strict";
			var numBeepers = this.get("numBeepers");
			return numBeepers > 1;
		} .property("numBeepers").cacheable(),
		
		addBeeper: function() {
		    "use strict";
			var world, wx, wy, beeper, things;
			world = this.get("world");
			wx = world.r2wx(this.get("rx"));
			wy = world.r2wy(this.get("ry"));
			beeper = WORLDSIM.Beeper.createBeeper(world, wx, wy);
			things = this.get("things");
			things.pushObject(beeper);
		},

		// NOTE: Will not complain if there is no beeper present when called
		removeBeeper: function() {
		    "use strict";
            var things, ii, len;
			things = this.get("things");
			for ( ii = 0, len = things.length; ii < len; ii += 1 ) {
			    if ( things[ii].type === "BEEPER" ) {
					things.removeAt(ii);   // NOTE: *NOT* things.splice(ii, 1) -- want Ember events!
					return;  // Only remove one
                }					
			}
		},
		
		// NOTE: Will not complain if there is no beeper present when called
		removeAllBeepers: function() {
		    "use strict";
            var things, ii, len, cnt;
			cnt = 0;
			things = this.get("things");
			// Go backwards so deletions don't ruin our processing!
			for ( len = things.length, ii = len-1; ii >= 0; ii -= 1 ) {
			    if ( things[ii].type === "BEEPER" ) {
    			    things.removeAt(ii);   // NOTE: *NOT* things.splice(ii, 1) -- want Ember events!
                    cnt = cnt + 1;
				}					
			}
			return cnt;
		}
	});
	
	// ----- Corridor -----
	
	WORLDSIM.Corridor.reopen({
		wall: function() {
		    "use strict";
			var things, ii, len;
			things = this.get("things");
			for ( ii = 0, len = things.length; ii < len; ii += 1 ) {
			    if ( things[ii].get("type") === "WALL" ) {
				    return things[ii];
				}
			}
			return null;
		} .property("things", "things.@each", "things.@each.type").cacheable(),
		
		hasWall: function() {
		    "use strict";
			var wall = this.get("wall");
			return (wall !== null);
		} .property("wall").cacheable(),
		
		wallType: function() {
		    "use strict";
			var wall = this.get("wall");
			if ( wall !== null ) {
    		    return wall.get("wallType");
			}
			// If we get here it is because there is no Wall object
			return WORLDSIM.Wall.WALLTYPE_CLEAR;
		} .property("wall", "wall.wallType").cacheable(),	
					
		// NOTE: Use WORLDSIM.Wall.WALLTYPE_CLEAR to clear a wall
		setWall: function(wallType) {
		    "use strict";
			var things, ii, len, world, wx, wy, wall;
			things = this.get("things");
			for ( ii = 0, len = things.length; ii < len; ii += 1 ) {
			    if ( things[ii].get("type") === "WALL" ) {
				    things[ii].set("wallType", wallType);
					return true; // We can only have one Wall per Corridor
				}
			}
			// If we get here it is because there was no Wall object
			// yet in this Corridor's list of Thing objects--create one
			world = this.get("world");
			wx = world.r2wx(this.get("rx"));
			wy = world.r2wy(this.get("ry"));
			wall = WORLDSIM.Wall.createWall(world, wx, wy, wallType);
			things = this.get("things");
			things.pushObject(wall);
		}
	});

	// ----- World -----

	WORLDSIM.World.reopen({
	    karel: null,
		numBeepersInWorld: 0,      // Denormalization for performance since always shown in status

		karelsIntersection: function() {
		    "use strict";
			var karel, wx, wy;
			karel = this.get("karel");
			wx = karel.get("wx");
			wy = karel.get("wy");
			intersection = this.grid[wy][wx];
			return intersection;
		} .property("karel", "karel.wx", "karel.wy").cacheable(),
		
		setKarel: function(status, wx, wy, direction) {
		    "use strict";
			var karel;
			karel = this.get("karel");
			if ( karel === null ) {
			    karel = WORLDSIM.Karel.createKarel(this, status, wx, wy, direction);
				this.set("karel", karel);
			}
			karel.setStatus(status);
			karel.setLocation(wx, wy);
			karel.setDirection(direction);
		},
		
		// NOTE: May only be used after setKarel is called at least once
		setKarelStatus: function(status) {
		    "use strict";
			var karel;
			karel = this.get("karel");
			karel.setStatus(status);
		},
		
		// NOTE: May only be used after setKarel is called at least once
		setKarelLocation: function(wx, wy) {
		    "use strict";
			var karel;
			karel = this.get("karel");
			karel.setLocation(wx, wy);
		},
		
		// NOTE: May only be used after setKarel is called at least once
		setKarelDirection: function(direction) {
		    "use strict";
			var karel;
			karel = this.get("karel");
			karel.setDirection(direction);
		},

		addBeeper: function(wx, wy) {
		    "use strict";
			var rx, ry, grid, intersection;
			rx = this.w2rx(wx);
			ry = this.w2ry(wy);
			grid = this.get("grid");
			intersection = grid[ry][rx];
			intersection.addBeeper();
			this.set("numBeepersInWorld", this.get("numBeepersInWorld") + 1);
		},

		removeBeeper: function(wx, wy) {
		    "use strict";
			var rx, ry, grid, intersection;
			rx = this.w2rx(wx);
			ry = this.w2ry(wy);
			grid = this.get("grid");
			intersection = grid[ry][rx];
			intersection.removeBeeper();
			this.set("numBeepersInWorld", this.get("numBeepersInWorld") - 1);
		},
		
		removeAllBeepers: function(wx, wy) {
		    "use strict";
		    var rx, ry, grid, intersection, cnt;
			rx = this.w2rx(wx);
			ry = this.w2ry(wy);
			grid = this.get("grid");
			intersection = grid[ry][rx];
			cnt = intersection.removeAllBeepers();
			this.set("numBeepersInWorld", this.get("numBeepersInWorld") - cnt);
		},
		
		// NOTE: Use WORLDSIM.Wall.WALLTYPE_CLEAR to clear a wall
		setWall: function(wx, wy, wallType) {
			"use strict";
			var rx, ry, grid, corridor;
			rx = this.w2rx(wx);
			ry = this.w2ry(wy);
			grid = this.get("grid");
			corridor = grid[ry][rx];
			corridor.setWall(wallType);
		}
	});

	WORLDSIM.World.reopenClass({
	});

	WORLDSIM.worldController.reopen({
	    createWorld: function(maxWx, maxWy) {
		    "use strict";
			var world, karel;
			
			world = this._super(maxWx, maxWy);
			
			// When Karel World is created, Karel must be in it!
			// Create Karel object, turned on, located at (1,1) and 
			// facing north, and add to our world
			karel = WORLDSIM.Karel.createKarel(world, "on", 1, 1, "north");
			world.set("karel", karel);
			world.set("numBeepersInWorld", 0);
			
			return world;
		}
	});
	
	window.WORLDSIM = WORLDSIM;
    return WORLDSIM;
	
});

