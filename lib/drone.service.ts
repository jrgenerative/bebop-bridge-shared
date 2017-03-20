import { Flightplan } from './flightplan';
import { Observable } from 'rxjs/Observable';

export interface DroneServiceConstructor {
    new (): DroneService;
}

export function createDroneService(ctor: DroneServiceConstructor): DroneService {
    return new ctor();
}

/**
 * The implementation is expected to extend EventEmitter.
 * 
 */
export interface DroneService {

    /**
     * A hot observable returning the current flight plan whenever a new one is stored on the vehicle.
     */
    flightplan(): Observable<Flightplan>

    /**
     * A hot observable reporting the distance to the take-off position
     * of the currently loaded flight plan.
     */
    flightplanTakeoffDistance(): Observable<number>;

    // TODO: add all possible events
    //  * Events:
    //  * 'error':
    //  * 'battery-level': 0 to 100.
    //  * 'connection-quality': in dbm -30 (amazing), -67 (very good), -70 (okay), -80 (not good), to -90 (no reception possible anymore).
    //  * 

    // ===============================================================================================


    /**
     * Requests to establish a connection to the DroneService.
     * Once the connection is established the event "connected" is emitted with a boolean as parameter
     * which is true if the connection wasn't established before the call, and also if the connection
     * was already established.
     * If there is a problem connecting, the "error" event is emitted.
     * Connecting to an already connected DroneService emits an error.
     */
    connect(): void;

    /**
     * Request takeoff.
     * Once the vehicle is flying, the event "airborne" is emitted.
     */
    takeoff(): void;

    /**
     * Request to land.
     * Once the vehicle has touched down, the event "touchdown" is emitted.
     */
    land(): void;

    /**
     * Command pitch angle.
     * -100 corresponds to a pitch angle of max pitch backward (DroneService will fly backward).
     * +100 corresponds to a pitch angle of max pitch forward (DroneService will fly forward).
     */
    pitch(angle: number): void;

    /**
    * Command roll angle.
    * -100 corresponds to a roll angle of max to the left (DroneService will fly left).
    * +100 corresponds to a roll angle of max to the right (DroneService will fly right)
    */
    roll(angle: number): void;

    /**
     * Command yaw rotation speed [-100, 100]. 
     * -100 corresponds to a counter-clockwise rotation of max yaw rotation speed.
     * +100 corresponds to a clockwise rotation of max yaw rotation speed
     */
    yaw(speed: number): void;

    /**
     * Throttle as signed percentage [-100, 100].
     * -100 corresponds to a max vertical speed towards ground.
     * +100 corresponds to a max vertical speed towards sky.
     */
    lift(speed: number): void;

    /**
     * Command a stand still.
     */
    level(): void;

    /**
     * Starts or restarts a paused flight plan.
     * If the flight plan was paused via pauseMission() the vehicle will
     * continue to the next waypoint.
     */
    startMission(): void;

    /**
     * Pauses a mission started via startMission(). 
     * The vehicle will remain at the current position
     */
    pauseMission(): void;

    /**
     * Abort a mission.The vehicle will remain at the current mission.
     * The currently running mission is reset and will start again at the first
     * waypoint if startMission() is called subsequently.
     */
    stopMission(): void;

    /**
     * Upload a flight plan to the vehicle.
     * The function must ensure that any previously stored flight plan is deleted or if this fails an appropriate error is thrown.
     * The function is asynchronous and triggers a 'flightphlan' or 'error' event.
     * The function is to be implemented asynchronous and shall emit a 'success' or 'error' event.
     * @param filename the absoulte filename from which to load the flight plan to be uploaded.
     */
    uploadFlightplan(flightplan: Flightplan): void;

    /**
     * Download the current flight plan from the vehicle.
     * The function is asynchronous and triggers a 'flightplan' or 'error' event.
     * The 'flightplan' event consists of a string containing the flight plan generated via
     * JSON.stringify(<flightplan>). Stringify converts tabs and linebreaks to \t and \n in the trasmitted string. It also 
     * adds " at the start and end of the string.
     */
    downloadFlightplan(): void;

    /**
     * Delete the current flight plan from the vehicle.
     * The function is asynchronous and triggers a 'flightplan' or 'error' event.
     * If successful, a 'flightplan' event delivering an empty flight plan is emitted.
     */
    deleteFlightplan(): void;

    /**
     * Return the distance in meters from the take-off position of the
     * currently loaded flight plan.
     */
    distanceToFlightplanTakeoff(): Observable<number>;

}
