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
    return Flightplan;
}(events_1.EventEmitter));
exports.Flightplan = Flightplan;
//# sourceMappingURL=flightplan.js.map