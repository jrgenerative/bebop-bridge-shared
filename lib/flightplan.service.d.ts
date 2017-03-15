import { Observable } from 'rxjs/Observable';
import { Flightplan } from "./Flightplan";
export interface FlightplanServiceConstructor {
    new (): FlightplanService;
}
export declare function createFlightplanService(ctor: FlightplanServiceConstructor): FlightplanService;
/**
 * Access to a flight plan library.
 *
 */
export interface FlightplanService {
    /**
     * A hot observable delivering a list of flight plan names whenever there
     * is a change in the flight plan library.
     */
    flightplanList(): Observable<string[]>;
    /**
    * Retrieve a list of currently available flight plan names.
    * @return A cold observable providing a list of flight plan names.
    */
    listFlightplans(): Observable<string[]>;
    /**
     * Load and return a flight plan.
     * @return A cold observable providing a flight plan once.
     */
    loadFlightplan(name: string): Observable<Flightplan>;
    /**
     * Save a flight plan. Triggers a flightplan-list event.
     * @param The flight plan to store.
     */
    saveFlightplan(flightplan: Flightplan): Observable<void>;
    /**
     * Delete a flight plan. Triggers a flightplan-list event.
     * @param The name of the flight plan to delete.
     */
    deleteFlightplan(name: string): Observable<void>;
}
