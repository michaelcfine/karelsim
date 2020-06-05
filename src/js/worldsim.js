// worldsim.js
//
// Created: 12/15/2012
//      by: Mike Fine (michaelcfine@gmail.com)
//
// OVERVIEW
// ~~~~~~~~
// World simulator that uses Ember to make keeping a UI representation
// of a "world" (e.g., Karel the Robot's world) up-to-date based on
// a world model.
//
// OBJECT MODEL
// ~~~~~~~~~~~~
// A World object represents a two-dimensional array and contains 
// a maximum X dimension and a maximum Y dimension (in DOM coordinates).
// The two-dimensional array is called the "grid". Each element in
// the grid contains a Location object.
//
// Each Location object contains a back pointer to its containing World
// object, a type string (see below; e.g., INTERSECTION), coordinates
// (in DOM coordinate space), and an array of Thing objects.
//	
// There are two types of Location objects: Intersection objects 
// and Corridor objects. Intersection objects exist when both of the
// x- and y-coordinates of the Location are even (divisible by two)
//
// A generic Thing object with a back pointer to the World, a type
// string, and x- and y-coordinates (in DOM coordinate space) is defined
// but each use/extension of World will define one or more subclasses 
// of the Thing class.
//
// EXTENSIBILITY / CUSTOMIZATION
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// WORLDSIM utilizes a "plug in" model to support multiple worlds
// with various kinds of things in those worlds. 
// Extensions/uses of WORLDSIM should use Ember's Class.reopen() and 
// Class.reopenClass() to add new properties and methods to instances
// or classes. Specifically, each WORLDSIM client will define one
// or more subclasses of Thing and will add one or more properties
// to Intersection and Corridor objects to track Things at those
// locations. The naming convention is to put the code defining
// these extensions into a file named worldsim.xxxsim.js where xxx
// corresponds to the specific world simulator (e.g., karel).
//

define(
["EmberModule"],
function(Ember) {

	// ---------- GLOBAL APPLICATION OBJECT (An Ember Application object) ----------

	WORLDSIM = Ember.Application.create();

	// ---------- GENERIC UTILTITY FUNCTIONS ----------

	// twoDigit -- Convert number into two digit string, add leading zero if necessary
	WORLDSIM.twoDigit = function(n) {
	    if ( n < 10 ) {
    		return ( '0' + n );
		} else {
		    return ( '' + n );
		} 
	};
		
	// ---------- MODELS ----------
	
	// ----- World -----

	WORLDSIM.World = Ember.Object.extend({
		maxRx:         null, // Width of world, in DOM coordinates
		maxRy:         null, // Height of world, in DOM coordinates
		grid:          null, // [ry][rx] of Location objects (DOM coordinates)

		// NOTE: Grid is stored in row-major order! The first
		//       subscript is an ry (DOM coordinate) value and
		//       the second is an rx (DOM coordinate) value.
		
		// Convert from World coordinates to DOM-based coordinates
	    w2rx: function(wx) { return ( 2*wx - 2 ); 		            },
	    w2ry: function(wy) { return ( this.get("maxRy") - 2*wy );   },

        // Convert from DOM-based coordinates to World coordinates
        r2wx: function(rx) { return ( (rx + 2)/2 );                 },
        r2wy: function(ry) { return ( (this.get("maxRy") - ry)/2 ); },
		
		maxWx: function() {
		    "use strict";
			var maxRx = this.get("maxRx");
			return this.r2wx(maxRx);
		} .property("maxRx").cacheable(),
		
		maxWy: function() {
		    "use strict";
			var maxRy = this.get("maxRy");
			return this.r2wy(maxRy);
		} .property("maxRy").cacheable(),

		// Derived property to make Ember/Handlebars templates work well
		columns: function() {
		    "use strict";
			var maxRx, cols, rx, colObj;
			maxRx = this.get("maxRx");
			cols = [];
			for ( rx = 0; rx < maxRx - 1; rx += 1 ) {
			    // Column-level information
			    colObj = { 
				    rx: rx, 
					wx: this.r2wx(rx),
					displayWx: (rx % 2 === 0 ? ""+this.r2wx(rx) : ""),
					topBorderSpanId:    "span_" + WORLDSIM.twoDigit(rx) + "_" + "TB",
					topBorderCellId:    "cell_" + WORLDSIM.twoDigit(rx) + "_" + "TB",
					bottomBorderSpanId: "span_" + WORLDSIM.twoDigit(rx) + "_" + "BB",
					bottomBorderCellId: "cell_" + WORLDSIM.twoDigit(rx) + "_" + "BB",
					aveRowSpanId:       "span_" + WORLDSIM.twoDigit(rx) + "_" + "AR"
				};
			    // Add our column object to our array of columns
				cols[rx] = colObj;
			}
			return cols;
		} .property("maxRx").cacheable(),
		
		// Derived property to make Ember/Handlebars templates work well
		rows: function() {
		    "use strict";
			var grid, maxRy, maxRx, rows, cols, ry, rx, rowObj, colObj, isIntersection;
			grid = this.get("grid");
			maxRy = this.get("maxRy");
			maxRx = this.get("maxRx");
			rows = [];
			for ( ry = 0; ry < maxRy - 1; ry += 1 ) {
			    // Row-level information
			    rowObj = {
				    ry: ry,
					wy: this.r2wy(ry),
					displayWy: ( ry % 2 === 0 ? ""+this.r2wy(ry) : ""),
					leftBorderSpanId:  "span_" + "LB" + "_" + WORLDSIM.twoDigit(ry),
					leftBorderCellId:  "cell_" + "LB" + "_" + WORLDSIM.twoDigit(ry),
					stColSpanId:       "span_" + "SC" + "_" + WORLDSIM.twoDigit(ry),
					rightBorderSpanId: "span_" + "RB" + "_" + WORLDSIM.twoDigit(ry),
					rightBorderCellId: "cell_" + "RB" + "_" + WORLDSIM.twoDigit(ry)
				};
				// Child column-level information
			    cols = [];
			    for ( rx = 0; rx < maxRx - 1; rx += 1 ) {
				    isIntersection = ((ry % 2 === 0) && (rx % 2 === 0));
				    colObj = {
					    rx: rx,
					    wx: this.r2wx(rx),
                        spanId: "span_" + WORLDSIM.twoDigit(rx) + "_" + WORLDSIM.twoDigit(ry),
					    cellId: "cell_" + WORLDSIM.twoDigit(rx) + "_" + WORLDSIM.twoDigit(ry),
					    isIntersection: isIntersection,
						isCorridor:     !isIntersection,
						intersection:   (isIntersection ? grid[ry][rx] : null),
						corridor:       (isIntersection ? null : grid[ry][rx])
					};
				    cols[rx] = colObj;
				}
				rowObj["cols"] = cols;
				// Add our row object to our array of rows
                rows[ry] = rowObj;
			}
			return rows;
		} .property("maxRx", "maxRy", "grid").cacheable(),
		
		clear: function() {
		    "use strict";
			this.set("grid", WORLDSIM.World.initGrid(this, this.get("maxRx"), this.get("maxRy")));
		}
	});

	WORLDSIM.World.reopenClass({
	
		initGrid: function(world, maxRx, maxRy) {
		    "use strict";
			var Corridor, Intersection, grid, rx, ry;
			Corridor = WORLDSIM.Corridor;
			Intersection = WORLDSIM.Intersection;
			grid = [];
			for ( ry = 0; ry < maxRy; ry += 1 ) {
			    grid[ry] = [];
				for ( rx = 0; rx < maxRx; rx += 1 ) {
				    if ((ry %2 !== 0) || (rx%2 !== 0)) {
					    grid[ry][rx] = Corridor.createCorridor(world, rx, ry);
					} else {
					    grid[ry][rx] = Intersection.createIntersection(world, rx, ry);
					}
				}
			}
			return grid;
		},
		
		createWorld: function (maxWx, maxWy) {
			"use strict";
			var maxRx, maxRy, grid, world;

			// NOTE: Can't use World.w2rx() and World.w2ry() since World object
			//       has not yet been created and we want maxRx and maxRy defined
			//       before creating world so internal grid will be allocated
			//       appropriately. As well, this logic is for the max sizes,
			//       not for coordinates once max sizes have been defined.
			maxRx = 2*maxWx;
			maxRy = 2*maxWy;

			// Create World object
			world = WORLDSIM.World.create({
				maxRx:         maxRx,
				maxRy:         maxRy,
				grid:          null   // Created and assigned below
			});
			
			// Create fresh internal grid object
			world.set("grid", WORLDSIM.World.initGrid(world, maxRx, maxRy));

			return world;
		}
	});
	
	// ----- Location -----
	
	WORLDSIM.Location = Ember.Object.extend({
        world:      null,  // Back pointer to World object
	    type:       "",    // Type of location: Either "INTERSECTION" or "CORRIDOR"
	    rx:         null,  // Intersection x-axis location, in DOM coordinates
		ry:         null,  // Intersection y-axis location, in DOM coordinates
		things:     []     // Array of Thing objects at this Location
	});
	
	// ----- Intersection -----

	WORLDSIM.Intersection = WORLDSIM.Location.extend({
	    type:           "INTERSECTION",
		isIntersection: true,

		hasAtLeastOneThing: function() {
		    "use strict";
			var things = this.get("things");
			return (things.length > 0);
		} .property().cacheable()
	});

	WORLDSIM.Intersection.reopenClass({
	    createIntersection: function(world, rx, ry) {
		    "use strict";
			var intersection;

			intersection = WORLDSIM.Intersection.create({
			    world:      world,
			    type:       "INTERSECTION",
			    rx:         rx,
				ry:         ry,
				things:     []
			});

			return intersection;
		}
	});

	// ----- Corridor -----

	WORLDSIM.Corridor = WORLDSIM.Location.extend({
	    type:       "CORRIDOR",
		isCorridor: true
	});
	
	WORLDSIM.Corridor.reopenClass({
	    createCorridor: function(world, rx, ry) {
		    "use strict";
			var corridor;
			
			// Create Corridor object
			corridor = WORLDSIM.Corridor.create({
			    world: world,
			    type: "CORRIDOR",
			    rx: rx,
				ry: ry,
				things: []
			});
			
			return corridor;
		}
	});

	// ----- Thing -----
	
	WORLDSIM.Thing = Ember.Object.extend({
	    world:      null,  // Back pointer to World object
	    type:       "",    // Type of thing: e.g., "BEEPER"
	    rx:         null,  // Thing x-axis location, in DOM coordinates
		ry:         null,  // Thing y-axis location, in DOM coordinates
		
		wx: function() {
		    "use strict";
			return this.world.r2wx(this.get("rx"));
		} .property("rx").cacheable(),
		
		wy: function() {
		    "use strict";
			return this.world.r2wy(this.get("ry"));
		} .property("ry").cacheable()
    });
	
	
	
	// ---------- VIEWS ----------
	
	WORLDSIM.WorldView = Ember.View.extend({
		templateName: "WorldView",
		tagName: "div"
	});
	
	WORLDSIM.WorldStatusView = Ember.View.extend({
		templateName: "WorldStatusView",
		tagName: "div"
	});
	
	// ---------- CONTROLLERS ----------
	
	WORLDSIM.worldController = Ember.ArrayController.create({
		world: null,
		worldView: null,
		worldStatusView: null,
		
		createWorld: function(maxRx, maxRy) {
		    "use strict";
			var world = WORLDSIM.World.createWorld(maxRx, maxRy);
			this.set("world", world);
			return world;
		},
		
		showWorld: function(sel) {
		    "use strict";
			var vv;
			this.removeWorld();               // In case it has already been shown
			vv = WORLDSIM.WorldView.create();
			vv.appendTo(sel);
			this.set("worldView", vv);        // Remember so we can remove it
		},
		
		removeWorld: function(sel) {
		    "use strict";
			var worldView = this.get("worldView");
			if ( worldView !== null ) {
		        worldView.remove();
			}
		},
		
		showWorldStatus: function(sel) {
		    "use strict";
			var vv;
			this.removeWorldStatus();         // In case it has alread been shown
			var vv = WORLDSIM.WorldStatusView.create();
			vv.appendTo(sel);
			this.set("worldStatusView", vv);  // Remember so we can remove it
		},
		
		removeWorldStatus: function(sel) {
		    "use strict";
			var worldStatusView = this.get("worldStatusView");
			if ( worldStatusView !== null ) {
		        worldStatusView.remove();
			}
		},
		
		// NOTE: Named initExplicit instead of init so can be invoked *after*
		//       worldController is returned to client/user (not before)
		initExplicit: function() {
		    "use strict";
		}
	});		


	window.WORLDSIM = WORLDSIM;
    return WORLDSIM;
	
});

