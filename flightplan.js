"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var geolib = require('geolib');
/**
 * Waypoint.
 */
var Waypoint = (function () {
    function Waypoint(latitude, longitude, altitude, orientation, radius // radius of the waypoint (within which point is considered reached)
    ) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.altitude = altitude;
        this.orientation = orientation;
        this.radius = radius; // radius of the waypoint (within which point is considered reached)
    }
    Object.defineProperty(Waypoint.prototype, "isValid", {
        get: function () {
            if (this.latitude <= 90.0 && this.latitude >= -90.0 &&
                this.longitude <= 180.0 && this.longitude >= -180.0 &&
                this.orientation <= 360.0 && this.orientation >= 0 &&
                this.radius >= 0) {
                return true;
            }
            else {
                return false;
            }
        },
        enumerable: true,
        configurable: true
    });
    Waypoint.prototype.clone = function () {
        var newObj = JSON.parse(JSON.stringify(this));
        var newPos = new Waypoint(parseFloat(newObj.latitude), parseFloat(newObj.longitude), parseFloat(newObj.height), parseFloat(newObj.orientation), parseFloat(newObj.radius));
        return newPos;
    };
    return Waypoint;
}());
exports.Waypoint = Waypoint;
/**
 * Flight plan.
 * The flightplan implementation must ensure that it can be completely constructed from its mavlink representation.
 */
var Flightplan = (function (_super) {
    __extends(Flightplan, _super);
    /**
     * Construct a flight plan instance. Can throw an error if parsing mavlink fails
     * @param mavlink If present, parseMavlink is called by the constructor, otherwise an
     * empty (equal to a cleared) and invalid flight plan is created.
     */
    function Flightplan(mavlink) {
        var _this = _super.call(this) || this;
        _this._name = '';
        _this._mavlink = '';
        _this._takeOffPosition = null;
        _this._touchDownPosition = null;
        _this._waypoints = []; // array of Positions without take-off and touch-down posititions (cmds '22', '21')
        _this.clear();
        if (mavlink) {
            _this.parseMavlink(mavlink);
        }
        return _this;
    }
    /**
     * Clear previously added data.
     * Invalidates this flight plan.
     */
    Flightplan.prototype.clear = function () {
        this._mavlink = '';
        this._name = '';
        this._waypoints.length = 0; // clears the array
        this._takeOffPosition = null;
        this._touchDownPosition = null;
    };
    Object.defineProperty(Flightplan.prototype, "isValid", {
        /**
         * Check if this is a valid flight plan.
         * A cleared flight plan (this.clear()) is not valid.
         */
        get: function () {
            if (this._takeOffPosition !== null && this._takeOffPosition.isValid &&
                this._touchDownPosition !== null && this._touchDownPosition.isValid &&
                this.waypoints.length >= 0 &&
                this._mavlink !== '' &&
                this._name !== '') {
                var valid = true;
                for (var _i = 0, _a = this._waypoints; _i < _a.length; _i++) {
                    var wp = _a[_i];
                    valid = valid && wp.isValid;
                }
                return valid;
            }
            else {
                return false;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Flightplan.prototype, "name", {
        /**
         * Return the name of this flight plan.
         */
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Flightplan.prototype, "mavlink", {
        /**
         * Return the flight plan in mavlink format.
         */
        get: function () {
            return this._mavlink;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Flightplan.prototype, "numWaypoints", {
        /**
         * Number of waypoints. Without take-off and touch-down positions.
         */
        get: function () {
            return this._waypoints.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Flightplan.prototype, "takeOffPosition", {
        /**
         * Get take-off waypoint.
         */
        get: function () {
            return this._takeOffPosition;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Flightplan.prototype, "touchDownPosition", {
        /**
         * Get touch-down waypoint.
         */
        get: function () {
            return this._touchDownPosition;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Flightplan.prototype, "waypoints", {
        /**
         * Get waypoints. Does not include take-off and touch-down waypoints.
         */
        get: function () {
            return this._waypoints;
        },
        enumerable: true,
        configurable: true
    });
    /**
    * Add waypoints every stepSize meters to the waypoints of this flight path and store the
    * result in outFlightPath. This function does not change 'this'. Accuracy radius and orientation
    * are taken from the previous waypoint of the respective leg.
    */
    Flightplan.prototype.addWaypoints = function (stepSize) {
        // At least 2 waypoints available?
        if (this.numWaypoints < 2) {
            throw new Error("Error adding waypoints. Flight path needs to have at least 2 waypoints.");
        }
        // backup waypoints
        var oldWps = [];
        for (var _i = 0, _a = this._waypoints; _i < _a.length; _i++) {
            var wp = _a[_i];
            oldWps.push(wp.clone());
        }
        this._waypoints = []; // clear waypoints
        // for each waypoint
        for (var i = 0; i < (oldWps.length - 1); i++) {
            var dist = geolib.getDistance(oldWps[i], oldWps[i + 1]); // distance between i and i+1
            var numSteps = Math.floor(dist / stepSize); // how many (entire) legs fit?
            this._waypoints.push(oldWps[i]); // add first existing waypoint (i) for each existing leg
            if (numSteps > 1) {
                var latStep = (oldWps[i + 1].latitude - oldWps[i].latitude) / numSteps;
                var lonStep = (oldWps[i + 1].longitude - oldWps[i].longitude) / numSteps;
                var heightStep = (oldWps[i + 1].altitude - oldWps[i].altitude) / numSteps;
                // add additional intermediate waypoints
                for (var j = 1; j < numSteps; j++) {
                    var lat = oldWps[i].latitude + j * latStep;
                    var lon = oldWps[i].longitude + j * lonStep;
                    var height = oldWps[i].altitude + j * heightStep;
                    var addPoint = new Waypoint(lat, lon, height, oldWps[i].orientation, // keep orientation
                    oldWps[i].radius); // keep accuracy
                    this._waypoints.push(addPoint); // add new intermediate waypoint (i+j*step)
                }
            }
        }
        this._waypoints.push(oldWps[oldWps.length - 1]); // add last existing waypoint of last leg (length-1)
    };
    /**
     * Parse a flightplan in Bebop mavlink format.
     * @param flightplan A string in Bebop mavlink format and containing a line with '// (name):{<flightplan-name}.
     * Throws and error in case a problem is encountered.
     */
    Flightplan.prototype.parseMavlink = function (flightplan) {
        this.clear();
        this._mavlink = flightplan; // store the raw mavlink
        var flightplanString = JSON.stringify(flightplan); //  This means, tabs and linebreaks appear as explicit '\t's and '\n's, and the string starts and ends with '"'.
        // expecting a string created with JSON.stringify(), 
        try {
            // Empty string ('""') denotes 'no flight plan available'.
            // Leave a cleared flightplan instance.
            if (flightplanString.length <= 2) {
                return;
            }
            flightplanString.trim(); // remove whitespace and tabs before and after characters.
            flightplanString = flightplanString.substr(1, flightplanString.length - 2); // remove " at start and end from stringify.
            var lines = flightplanString.split('\\n');
            if (lines.length < 3) {
                throw new Error('Invalid flight plan. Less than 3 mavlink statements could be parsed.');
            }
            for (var i = 0; i < lines.length; i++) {
                // skip any line containing '//' and the one containing 'QGC' (!)
                if (lines[i].indexOf("//") === -1 && lines[i].indexOf("QGC") === -1) {
                    var currentLine = lines[i].trim(); // remove whitespace and tabs before and after characters.
                    var lineEntries = currentLine.split('\\t');
                    if (lineEntries.length === 12) {
                        if (parseInt(lineEntries[11]) !== 1) {
                            throw new Error("Invalid flight plan line encountered. Line must end in \"1\": \"" + currentLine + "\".");
                        }
                        else {
                            var cmd = parseInt(lineEntries[3]);
                            // Take-off command?
                            if (cmd === 22) {
                                this._takeOffPosition = new Waypoint(parseFloat(lineEntries[8]), parseFloat(lineEntries[9]), parseFloat(lineEntries[10]), parseFloat(lineEntries[7]), 0.0); // latitude, longitude, height, orientation, radius
                            }
                            else if (cmd === 21) {
                                this._touchDownPosition = new Waypoint(parseFloat(lineEntries[8]), parseFloat(lineEntries[9]), parseFloat(lineEntries[10]), parseFloat(lineEntries[7]), 0.0); // latitude, longitude, height, orientation, radius
                            }
                            else if (cmd === 16) {
                                this._waypoints.push(new Waypoint(parseFloat(lineEntries[8]), parseFloat(lineEntries[9]), parseFloat(lineEntries[10]), parseFloat(lineEntries[7]), parseFloat(lineEntries[5])));
                            }
                        }
                    }
                    else {
                        // Consider ok. If line encountered with anything which is not 12 entries separated by \t.
                        // throw new Error("Invalid flight plan line encountered. Line doesn't have 12 entries or parsing of \"\\t\" failed: \"" + currentLine + "\".");
                    }
                }
                else {
                    // Parse the name of the flightplan from a commented line such as:
                    // // (name){<the_name>}
                    if (lines[i].indexOf("//") !== -1 && lines[i].indexOf("(name)") !== -1) {
                        var i1 = lines[i].indexOf("{");
                        var i2 = lines[i].indexOf("}");
                        if (i1 === -1 || i2 === -1) {
                            throw new Error('Invalid flight plan name encountered.');
                        }
                        if (i2 <= i1) {
                            throw new Error('Invalid flight plan name encountered.');
                        }
                        this._name = lines[i].substr(i1 + 1, i2 - (i1 + 1));
                    }
                }
            }
        }
        catch (err) {
            this.clear();
            console.log('An error occurred in parseMavlink()');
            console.log(JSON.stringify(err));
            console.log("Received flightplan string was:\n" + flightplan);
            throw (err);
        }
        // Do some checks
        if (this._name === '') {
            throw new Error('Could not extract valid flight plan from passed mavlink code. No name specified.');
        }
        if (!this.isValid) {
            // if not valid for other reasons
            throw new Error('Could not extract valid flight plan from passed mavlink code.');
        }
    };
    /**
     * Load a kmz (Google Earth path) file and parse its coordinate section.
     * Sets first point as take-off location and last point as touch-down location.
     * @param kmz The content of a kmz file.
     * @param name The name to set to the flight plan.
     */
    Flightplan.prototype.parseKmz = function (kmz, name) {
        this.clear();
        var kmzString = kmz;
        // expecting a string created with JSON.stringify(), 
        try {
            if (kmzString.length === 0) {
                return;
            }
            console.log("Kmz string: " + kmzString);
            var lines = kmzString.split('\n');
            var path = ''; // the line with the waypoints
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf("<coordinates>") !== -1) {
                    path = lines[i + 1];
                    break;
                }
            }
            path = path.trim(); // remove whitespace and tabs before and after characters.
            var waypoints = path.split(' ');
            var defaultOrientation = 0; // point north
            var defaultRadius = 2; // 2m radius
            for (var i = 0; i < waypoints.length; i++) {
                waypoints[i] = waypoints[i].replace(/\s/g, '');
                var waypointCoords = waypoints[i].split(',');
                if (waypointCoords.length !== 3) {
                    throw new Error("Waypoint with invalid number of coordinates encountered.");
                }
                this._waypoints.push(new Waypoint(parseFloat(waypointCoords[1]), parseFloat(waypointCoords[0]), parseFloat(waypointCoords[2]), defaultOrientation, defaultRadius));
            }
            if (this._waypoints.length < 2) {
                throw new Error("Less than two waypoints could be extracted from kmz content");
            }
            // Takeoff point
            this._takeOffPosition = new Waypoint(this._waypoints[0].latitude, this._waypoints[0].longitude, this._waypoints[0].altitude, this._waypoints[0].orientation, this._waypoints[0].radius); // latitude, longitude, height, orientation, radius
            // Touchdown point
            this._touchDownPosition = new Waypoint(this._waypoints[this._waypoints.length - 1].latitude, this._waypoints[this._waypoints.length - 1].longitude, this._waypoints[this._waypoints.length - 1].altitude, this._waypoints[this._waypoints.length - 1].orientation, this._waypoints[this._waypoints.length - 1].radius); // latitude, longitude, height, orientation, radius
            this._name = name;
        }
        catch (err) {
            this.clear();
            console.log('An error occurred in parseKmz()');
            console.log(JSON.stringify(err));
            console.log("Received kmz string was:\n" + kmz);
            throw (err);
        }
    };
    return Flightplan;
}(events_1.EventEmitter));
exports.Flightplan = Flightplan;
//# sourceMappingURL=flightplan.js.map