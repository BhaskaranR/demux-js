/// <reference types="bunyan" />
import { Logger } from './BunyanProvider';
import { ActionHandler, ActionReader, ActionWatcherOptions, DemuxInfo } from './interfaces';
/**
 * Coordinates implementations of `ActionReader`s and `ActionHandler`s in
 * a polling loop.
 */
export declare class BaseActionWatcher {
    protected actionReader: ActionReader;
    protected actionHandler: ActionHandler;
    /**
     * @param actionReader    An instance of an implemented `ActionReader`
     * @param actionHandler   An instance of an implemented `ActionHandler`
     * @param options
     */
    protected log: Logger;
    protected pollInterval: number;
    protected velocitySampleSize: number;
    protected processIntervals: Array<[number, number]>;
    private running;
    private shouldPause;
    private error;
    private clean;
    constructor(actionReader: ActionReader, actionHandler: ActionHandler, options: ActionWatcherOptions);
    /**
     * Starts a polling loop running in replay mode.
     */
    replay(): Promise<void>;
    /**
     * Start a polling loop
     *
     * @param isReplay  Set to true to disable Effects from running until caught up with head block.
     */
    watch(isReplay?: boolean): Promise<void>;
    /**
     * Start or resume indexing.
     */
    start(): boolean;
    /**
     * Suspend indexing. Will go into effect after the currently-processing block.
     */
    pause(): boolean;
    /**
     * Information about the current state of this Action Watcher
     */
    readonly info: DemuxInfo;
    /**
     * Use the actionReader and actionHandler to process new blocks.
     *
     * @param isReplay  Set to true to disable Effects from running until caught up with head block.
     */
    protected checkForBlocks(isReplay?: boolean): Promise<void>;
    private addProcessInterval;
    private getCurrentBlockVelocity;
    private getMaxBlockVelocity;
    private getIndexingStatus;
}
