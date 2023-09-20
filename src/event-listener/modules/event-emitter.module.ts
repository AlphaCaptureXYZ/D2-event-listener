import { BehaviorSubject } from 'rxjs';

let eventService = null;

export type EventType =
    | 'NEW_IDEA_NFT'
    | 'NOTIFICATION'
    | 'WS_LOG'

class EventEmitterService {
    private dataSource;
    private data;

    constructor() {
        this.initialize();
    }

    public initialize() {
        this.dataSource = new BehaviorSubject<any>({});
        this.data = this.dataSource.asObservable();
    }

    public emit<T>(type: EventType, data?: T) {
        this.dataSource.next({ type, data });
    }

    public listen() {
        return this.data;
    }

    public finish() {
        this.dataSource.next({});
    }

}

export const EventEmitterModule = (): EventEmitterService => {
    if (eventService === null) {
        eventService = new EventEmitterService();
    }
    return eventService;
};

