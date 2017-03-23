import { EventEmitter } from 'events';
let geolib = require('geolib');

/**
 * Waypoint.
 */
export class Waypoint {
    constructor(
        public latitude: number,
        public longitude: number,
        public altitude: number,
        public orientation: number,
        public radius: number // radius of the waypoint (within which point is considered reached)
    ) {
    }

    public get isValid(): boolean {
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

    public clone(): Waypoint {
        let newObj = JSON.parse(JSON.stringify(this));
        let newPos = new Waypoint(
            parseFloat(newObj.latitude),
            parseFloat(newObj.longitude),
            parseFloat(newObj.altitude),
            parseFloat(newObj.orientation),
            parseFloat(newObj.radius)
        );
        return newPos;
    }

}

/**
 * Flight plan.
 * The flightplan implementation must ensure that it can be completely constructed from its mavlink representation.
 */
export class Flightplan extends EventEmitter {

    private _name: string = '';
    private _mavlink: string = '';
    private _takeOffPosition: Waypoint = null;
    private _touchDownPosition: Waypoint = null;
    private _waypoints: Waypoint[] = []; // array of Positions without take-off and touch-down posititions (cmds '22', '21')

    /**
     * Construct a flight plan instance. Can throw an error if parsing mavlink fails
     * @param mavlink If present, parseMavlink is called by the constructor, otherwise an 
     * empty (equal to a cleared) and invalid flight plan is created.
     */
    constructor(mavlink?: string) {
        super();
        this.clear();
        if (mavlink) {
            this.parseMavlink(mavlink);
        }
    }

    /**
     * Clear previously added data.
     * Invalidates this flight plan.
     */
    public clear(): void {
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
    get isValid(): boolean {
        if (this._takeOffPosition !== null && this._takeOffPosition.isValid &&
            this._touchDownPosition !== null && this._touchDownPosition.isValid &&
            this.waypoints.length >= 0 &&
            this._mavlink !== '' &&
            this._name !== '') {
            let valid: boolean = true;
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
    get name(): string {
        return this._name;
    }

    /**
     * Return the flight plan in mavlink format.
     */
    get mavlink(): string {
        return this._mavlink;
    }

    /**
     * Number of waypoints. Without take-off and touch-down positions.
     */
    get numWaypoints(): number {
        return this._waypoints.length;
    }

    /**
     * Get take-off waypoint.
     */
    get takeOffPosition(): Waypoint {
        return this._takeOffPosition;
    }

    /**
     * Get touch-down waypoint.
     */
    get touchDownPosition(): Waypoint {
        return this._touchDownPosition;
    }

    /**
     * Get waypoints. Does not include take-off and touch-down waypoints.
     */
    get waypoints(): Waypoint[] {
        return this._waypoints;
    }

    /**
     * Set an accuracy radius for each waypoint.
     * @param radius Radius set for each waypoint.
     */
    setWaypointRadius(radius: number) {
        this._waypoints.forEach((wp) => {
            wp.radius = radius;
        });
        this._takeOffPosition.radius = radius;
        this._touchDownPosition.radius = radius;
    }

    /**
     * Set the altitude of the flight path.
     * @param altitude Altitude for all waypoints.
     */
    setAltitude(altitude: number) {
        this._waypoints.forEach((wp) => {
            wp.altitude = altitude;
        });
        this._takeOffPosition.altitude = altitude;
        this._touchDownPosition.altitude = altitude;
    }

    /**
     * Set a single bearing for all waypoints.
     * @param bearing Bearing for all waypoints.
     */
    setBearing(bearing: number) {
        this._waypoints.forEach((wp) => {
            wp.orientation = bearing;
        });
        this._takeOffPosition.orientation = bearing;
        this._touchDownPosition.orientation = bearing;
    }

    /**
     * Set bearings for each waypoint such that the vehicle
     * is facing the center of the bounding box of the flight path.
     */
    setBearingToCenter() {
        let center = geolib.getCenterOfBounds(this._waypoints);
        console.log('center: ' + center);
    }


    /**
    * Add waypoints every stepSize meters to the waypoints of this flight path. Latitude, longitude and altitude is interpolated.
    *  Waypoint radius and bearing are taken from the previous waypoint of the respective leg.
    */
    addWaypoints(stepSize: number) {

        // At least 2 waypoints available?
        if (this.numWaypoints < 2) {
            throw new Error("Error adding waypoints. Flight path needs to have at least 2 waypoints.");
        }

        // backup waypoints
        let oldWps: Waypoint[] = [];
        this._waypoints.forEach(wp => {
            console.log('cloning wp: ' + JSON.stringify(wp));
            oldWps.push(wp.clone());
            console.log('cloned: ' + JSON.stringify(oldWps[oldWps.length - 1]));
        });

        this._waypoints = []; // clear waypoints

        // for each waypoint
        for (let i = 0; i < (oldWps.length - 1); i++) {
            let dist = geolib.getDistance(oldWps[i], oldWps[i + 1]); // distance between i and i+1
            console.log('dist: ' + dist + ' stepsize ' + stepSize);
            let numSteps = Math.floor(dist / stepSize); // how many (entire) legs fit?
            this._waypoints.push(oldWps[i]); // add first existing waypoint (i) for each existing leg
            console.log('num steps ' + numSteps);
            if (numSteps > 1) {
                let latStep = (oldWps[i + 1].latitude - oldWps[i].latitude) / numSteps;
                let lonStep = (oldWps[i + 1].longitude - oldWps[i].longitude) / numSteps;
                let heightStep = (oldWps[i + 1].altitude - oldWps[i].altitude) / numSteps;
                // add additional intermediate waypoints
                for (let j = 1; j < numSteps; j++) {
                    let lat = oldWps[i].latitude + j * latStep;
                    let lon = oldWps[i].longitude + j * lonStep;
                    let height = oldWps[i].altitude + j * heightStep;
                    let addPoint = new Waypoint(
                        lat,
                        lon,
                        height,
                        oldWps[i].orientation, // keep orientation
                        oldWps[i].radius); // keep accuracy
                    this._waypoints.push(addPoint); // add new intermediate waypoint (i+j*step)
                    console.log('Additional waypoint added: ' + JSON.stringify(addPoint));
                }
            }
        }
        this._waypoints.push(oldWps[oldWps.length - 1]); // add last existing waypoint of last leg (length-1)
    }

    /**
     * Parse a flightplan in Bebop mavlink format.
     * @param flightplan A string in Bebop mavlink format and containing a line with '// (name):{<flightplan-name}.
     * Throws and error in case a problem is encountered.
     */
    parseMavlink(flightplan: string) {

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

            flightplanString.trim();  // remove whitespace and tabs before and after characters.
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
                    if (lineEntries.length === 12) { // valid command line has 12 entries and ends with '1'.
                        if (parseInt(lineEntries[11]) !== 1) {
                            throw new Error("Invalid flight plan line encountered. Line must end in \"1\": \"" + currentLine + "\".");
                        }
                        else {
                            let cmd = parseInt(lineEntries[3]);
                            // Take-off command?
                            if (cmd === 22) {
                                this._takeOffPosition = new Waypoint(parseFloat(lineEntries[8]), parseFloat(lineEntries[9]), parseFloat(lineEntries[10]), parseFloat(lineEntries[7]), 0.0); // latitude, longitude, height, orientation, radius
                            }
                            // Touch-down command?
                            else if (cmd === 21) {
                                this._touchDownPosition = new Waypoint(parseFloat(lineEntries[8]), parseFloat(lineEntries[9]), parseFloat(lineEntries[10]), parseFloat(lineEntries[7]), 0.0); // latitude, longitude, height, orientation, radius
                            }
                            // Waypoint?
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
                        let i1: number = lines[i].indexOf("{");
                        let i2: number = lines[i].indexOf("}");
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


    /**
     * Load a kmz (Google Earth path) file and parse its coordinate section.
     * Sets first point as take-off location and last point as touch-down location.
     * @param kmz The content of a kmz file.
     * @param name The name to set to the flight plan.
     */
    parseKmz(kmz: string, name: string, bearing: number = 0, waypointRadius: number = 2) {

        this.clear();
        let kmzString = kmz;

        // expecting a string created with JSON.stringify(), 
        try {

            if (kmzString.length === 0) {
                return;
            }

            console.log("Kmz string: " + kmzString);

            let lines = kmzString.split('\n');

            let path: string = ''; // the line with the waypoints
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].indexOf("<coordinates>") !== -1) {
                    path = lines[i + 1];
                    break;
                }
            }

            path = path.trim(); // remove whitespace and tabs before and after characters.
            let waypoints: string[] = path.split(' ');
            for (let i = 0; i < waypoints.length; i++) {
                waypoints[i] = waypoints[i].replace(/\s/g, '');
                let waypointCoords: string[] = waypoints[i].split(',');
                if (waypointCoords.length !== 3) {
                    throw new Error("Waypoint with invalid number of coordinates encountered.");
                }
                this._waypoints.push(new Waypoint(
                    parseFloat(waypointCoords[1]),
                    parseFloat(waypointCoords[0]),
                    parseFloat(waypointCoords[2]),
                    bearing,
                    waypointRadius
                ));
            }

            if (this._waypoints.length < 2) {
                throw new Error("Less than two waypoints could be extracted from kmz content");
            }

            // Takeoff point is equal to first waypoint
            this._takeOffPosition = new Waypoint(
                this._waypoints[0].latitude,
                this._waypoints[0].longitude,
                this._waypoints[0].altitude,
                this._waypoints[0].orientation,
                this._waypoints[0].radius); // latitude, longitude, height, orientation, radius

            // Touchdown point is equal to last waypoint
            this._touchDownPosition = new Waypoint(
                this._waypoints[this._waypoints.length - 1].latitude,
                this._waypoints[this._waypoints.length - 1].longitude,
                this._waypoints[this._waypoints.length - 1].altitude,
                this._waypoints[this._waypoints.length - 1].orientation,
                this._waypoints[this._waypoints.length - 1].radius); // latitude, longitude, height, orientation, radius

            this._name = name;

        }
        catch (err) {
            this.clear();
            console.log('An error occurred in parseKmz()');
            console.log(JSON.stringify(err));
            console.log("Received kmz string was:\n" + kmz);
            throw (err);
        }
    }

}


