/// <reference types="node" />
import { EventEmitter } from 'events';
/**
 * Waypoint.
 */
export declare class Waypoint {
    latitude: number;
    longitude: number;
    altitude: number;
    orientation: number;
    radius: number;
    constructor(latitude: number, longitude: number, altitude: number, orientation: number, radius: number);
    readonly isValid: boolean;
    clone(): Waypoint;
}
/**
 * Flight plan.
 * The flightplan implementation must ensure that it can be completely constructed from its mavlink representation.
 */
export declare class Flightplan extends EventEmitter {
    private _name;
    private _mavlink;
    private _takeOffPosition;
    private _touchDownPosition;
    private _waypoints;
    /**
     * Construct a flight plan instance. Can throw an error if parsing mavlink fails
     * @param mavlink If present, parseMavlink is called by the constructor, otherwise an
     * empty (equal to a cleared) and invalid flight plan is created.
     */
    constructor(mavlink?: string);
    /**
     * Clear previously added data.
     * Invalidates this flight plan.
     */
    clear(): void;
    /**
     * Check if this is a valid flight plan.
     * A cleared flight plan (this.clear()) is not valid.
     */
    readonly isValid: boolean;
    /**
     * Return the name of this flight plan.
     */
    readonly name: string;
    /**
     * Return the flight plan in mavlink format.
     */
    readonly mavlink: string;
    /**
     * Number of waypoints. Without take-off and touch-down positions.
     */
    readonly numWaypoints: number;
    /**
     * Get take-off waypoint.
     */
    readonly takeOffPosition: Waypoint;
    /**
     * Get touch-down waypoint.
     */
    readonly touchDownPosition: Waypoint;
    /**
     * Get waypoints. Does not include take-off and touch-down waypoints.
     */
    readonly waypoints: Waypoint[];
    /**
    * Add waypoints every stepSize meters to the waypoints of this flight path.
    *  Accuracy radius and orientation are taken from the previous waypoint of the respective leg.
    */
    addWaypoints(stepSize: number): void;
    /**
     * Parse a flightplan in Bebop mavlink format.
     * @param flightplan A string in Bebop mavlink format and containing a line with '// (name):{<flightplan-name}.
     * Throws and error in case a problem is encountered.
     */
    parseMavlink(flightplan: string): void;
    /**
     * Load a kmz (Google Earth path) file and parse its coordinate section.
     * Sets first point as take-off location and last point as touch-down location.
     * @param kmz The content of a kmz file.
     * @param name The name to set to the flight plan.
     */
    parseKmz(kmz: string, name: string, bearing?: number, waypointRadius?: number): void;
}
