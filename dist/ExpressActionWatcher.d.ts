import express from 'express';
import { BaseActionWatcher } from './BaseActionWatcher';
import { ActionHandler, ActionReader, ExpressActionWatcherOptions } from './interfaces';
/**
 * Exposes the BaseActionWatcher's API methods through a simple REST interface using Express
 */
export declare class ExpressActionWatcher extends BaseActionWatcher {
    protected actionReader: ActionReader;
    protected actionHandler: ActionHandler;
    protected options: ExpressActionWatcherOptions;
    /**
     * @param actionReader    An instance of an implemented `ActionReader`
     * @param actionHandler   An instance of an implemented `ActionHandler`
     * @param options
     */
    express: express.Express;
    protected port: number;
    private server;
    constructor(actionReader: ActionReader, actionHandler: ActionHandler, options: ExpressActionWatcherOptions);
    /**
     * Start the Express server
     */
    listen(): Promise<boolean>;
    /**
     * Close the Express server
     */
    close(): Promise<boolean>;
}
