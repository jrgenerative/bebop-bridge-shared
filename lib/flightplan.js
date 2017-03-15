"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
/**
 * Waypoint.
 */
class Waypoint {
    constructor(latitude, longitude, altitude, orientation, radius // radius of the waypoint (within which point is considered reached)
    ) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.altitude = altitude;
        this.orientation = orientation;
        this.radius = radius; // radius of the waypoint (within which point is considered reached)
    }
    get isValid() {
        if (this.latitude <= 90.0 && this.latitude >= -90.0 &&
            this.longitude <= 180.0 && this.longitude >= -180.0 &&
            this.orientation <= 360.0 && this.orientation >= 0 &&
            this.radius >= 0) {
            return true;
        }
        else {
            return false;
        }
    }
}
exports.Waypoint = Waypoint;
/**
 * Flight plan.
 * The flightplan implementation must ensure that it can be completely constructed from its mavlink representation.
 */
class Flightplan extends events_1.EventEmitter {
    /**
     * Construct a flight plan instance. Can throw an error if parsing mavlink fails
     * @param mavlink If present, parseMavlink is called by the constructor, otherwise an
     * empty (equal to a cleared) and invalid flight plan is created.
     */
    constructor(mavlink) {
        super();
        this._name = '';
        this._mavlink = '';
        this._takeOffPosition = null;
        this._touchDownPosition = null;
        this._waypoints = []; // array of Positions without take-off and touch-down posititions (cmds '22', '21')
        this.clear();
        if (mavlink) {
            this.parseMavlink(mavlink);
        }
    }
    /**
     * Clear previously added data.
     * Invalidates this flight plan.
     */
    clear() {
        this._mavlink = '';
        this._name = '';
        this._waypoints.length = 0; // clears the array
        this._takeOffPosition = null;
        this._touchDownPosition = null;
    }
    /**
     * Check if this is a valid flight plan.
     * A cleared flight plan (this.clear()) is not valid.
     */
    get isValid() {
        if (this._takeOffPosition !== null && this._takeOffPosition.isValid &&
            this._touchDownPosition !== null && this._touchDownPosition.isValid &&
            this.waypoints.length >= 0 &&
            this._mavlink !== '' &&
            this._name !== '') {
            let valid = true;
            for (let wp of this._waypoints) {
                valid = valid && wp.isValid;
            }
            return valid;
        }
        else {
            return false;
        }
    }
    /**
     * Return the name of this flight plan.
     */
    get name() {
        return this._name;
    }
    /**
     * Return the flight plan in mavlink format.
     */
    get mavlink() {
        return this._mavlink;
    }
    /**
     * Number of waypoints. Without take-off and touch-down positions.
     */
    get numWaypoints() {
        return this._waypoints.length;
    }
    /**
     * Get take-off waypoint.
     */
    get takeOffPosition() {
        return this._takeOffPosition;
    }
    /**
     * Get touch-down waypoint.
     */
    get touchDownPosition() {
        return this._touchDownPosition;
    }
    /**
     * Get waypoints. Does not include take-off and touch-down waypoints.
     */
    get waypoints() {
        return this._waypoints;
    }
    /**
     * Parse a flightplan in Bebop mavlink format.
     * @param flightplan A string in Bebop mavlink format and containing a line with '// (name):{<flightplan-name}.
     * Throws and error in case a problem is encountered.
     */
    parseMavlink(flightplan) {
        this.clear();
        this._mavlink = flightplan; // store the raw mavlink
        let flightplanString = JSON.stringify(flightplan); //  This means, tabs and linebreaks appear as explicit '\t's and '\n's, and the string starts and ends with '"'.
        // expecting a string created with JSON.stringify(), 
        try {
            // Empty string ('""') denotes 'no flight plan available'.
            // Leave a cleared flightplan instance.
            if (flightplanString.length <= 2) {
                return;
            }
            flightplanString.trim(); // remove whitespace and tabs before and after characters.
            flightplanString = flightplanString.substr(1, flightplanString.length - 2); // remove " at start and end from stringify.
            let lines = flightplanString.split('\\n');
            if (lines.length < 3) {
                throw new Error('Invalid flight plan. Less than 3 mavlink statements could be parsed.');
            }
            for (let i = 0; i < lines.length; i++) {
                // skip any line containing '//' and the one containing 'QGC' (!)
                if (lines[i].indexOf("//") === -1 && lines[i].indexOf("QGC") === -1) {
                    let currentLine = lines[i].trim(); // remove whitespace and tabs before and after characters.
                    let lineEntries = currentLine.split('\\t');
                    if (lineEntries.length === 12) {
                        if (parseInt(lineEntries[11]) !== 1) {
                            throw new Error("Invalid flight plan line encountered. Line must end in \"1\": \"" + currentLine + "\".");
                        }
                        else {
                            let cmd = parseInt(lineEntries[3]);
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
                        let i1 = lines[i].indexOf("{");
                        let i2 = lines[i].indexOf("}");
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
    }
}
exports.Flightplan = Flightplan;
//# sourceMappingURL=flightplan.js.map