/// <reference types="bunyan" />
import { Logger } from './BunyanProvider';
import { Action, ActionHandler, ActionHandlerOptions, Effect, EffectRunMode, HandlerInfo, HandlerVersion, IndexState, NextBlock, VersionedAction } from './interfaces';
/**
 * Takes `block`s output from implementations of `AbstractActionReader` and processes their actions through the
 * `Updater`s and `Effect`s of the current `HandlerVersion`. Pass an object exposing a persistence API as `state` to the
 * `handleWithState` method. Persist and retrieve information about the last block processed with `updateIndexState` and
 * `loadIndexState`. Implement `rollbackTo` to handle when a fork is encountered.
 *
 */
export declare abstract class AbstractActionHandler implements ActionHandler {
    protected lastProcessedBlockNumber: number;
    protected lastProcessedBlockHash: string;
    protected lastIrreversibleBlockNumber: number;
    protected handlerVersionName: string;
    protected isReplay: boolean;
    protected log: Logger;
    protected effectRunMode: EffectRunMode;
    protected initialized: boolean;
    private deferredEffects;
    private handlerVersionMap;
    private runningEffects;
    private effectErrors;
    private maxEffectErrors;
    private validateBlocks;
    /**
     * @param handlerVersions  An array of `HandlerVersion`s that are to be used when processing blocks. The default
     *                         version name is `"v1"`.
     *
     * @param options
     */
    constructor(handlerVersions: HandlerVersion[], options?: ActionHandlerOptions);
    /**
     * Receive block, validate, and handle actions with updaters and effects
     */
    handleBlock(nextBlock: NextBlock, isReplay: boolean): Promise<number | null>;
    /**
     * Information about the current state of the Action Handler
     */
    readonly info: HandlerInfo;
    /**
     * Performs all required initialization for the handler.
     */
    initialize(): Promise<void>;
    /**
     * Updates the `lastProcessedBlockNumber` and `lastProcessedBlockHash` meta state, coinciding with the block
     * that has just been processed. These are the same values read by `updateIndexState()`.
     */
    protected abstract updateIndexState(state: any, nextBlock: NextBlock, isReplay: boolean, handlerVersionName: string, context?: any): Promise<void>;
    /**
     * Returns a promise for the `lastProcessedBlockNumber` and `lastProcessedBlockHash` meta state,
     * coinciding with the block that has just been processed.
     * These are the same values written by `updateIndexState()`.
     * @returns A promise that resolves to an `IndexState`
     */
    protected abstract loadIndexState(): Promise<IndexState>;
    /**
     * Must call the passed-in `handle` function within this method, passing in a state object that will be passed in to
     * the `state` parameter to all calls of `Updater.apply`. Optionally, pass in a `context` object as a second
     * parameter, which can be utilized to share state across `Updater.apply` and `Effect.run` calls on a per-block basis.
     */
    protected abstract handleWithState(handle: (state: any, context?: any) => void): Promise<void>;
    /**
     * Idempotently performs any required setup.
     */
    protected abstract setup(): Promise<void>;
    /**
     * This method is used when matching the types of incoming actions against the types the `Updater`s and `Effect`s are
     * subscribed to. When this returns true, their corresponding functions will run.
     *
     * By default, this method tests for direct equivalence between the incoming candidate type and the type that is
     * subscribed. Override this method to extend this functionality (e.g. wildcards).
     *
     * @param candidateType   The incoming action's type
     * @param subscribedType  The type the Updater of Effect is subscribed to
     * @param _payload        The payload of the incoming Action.
     */
    protected matchActionType(candidateType: string, subscribedType: string, _payload?: any): boolean;
    /**
     * Process actions against deterministically accumulating `Updater` functions. Returns a promise of versioned actions
     * for consumption by `runEffects`, to make sure the correct effects are run on blocks that include a `HandlerVersion`
     * change. To change a `HandlerVersion`, have an `Updater` function return the `versionName` of the corresponding
     * `HandlerVersion` you want to change to.
     */
    protected applyUpdaters(state: any, nextBlock: NextBlock, context: any, isReplay: boolean): Promise<VersionedAction[]>;
    /**
     * Process versioned actions against asynchronous side effects.
     */
    protected runEffects(versionedActions: VersionedAction[], context: any, nextBlock: NextBlock): Promise<void>;
    /**
     * Will run when a rollback block number is passed to handleActions. Implement this method to
     * handle reversing actions full blocks at a time, until the last applied block is the block
     * number passed to this method.
     */
    protected abstract rollbackTo(blockNumber: number): Promise<void>;
    /**
     * Calls `applyUpdaters` and `runEffects` on the given actions
     */
    protected handleActions(state: any, context: any, nextBlock: NextBlock, isReplay: boolean): Promise<void>;
    private handleRollback;
    private range;
    protected runOrDeferEffect(effect: Effect, payload: any, nextBlock: NextBlock, context: any): Promise<void>;
    protected shouldRunOrDeferEffect(effect: Effect, action: Action): boolean;
    private curryEffectRun;
    private runDeferredEffects;
    private getNextDeferredBlockNumber;
    private checkRunningEffects;
    private rollbackDeferredEffects;
    private initHandlerVersions;
    private loggedUpdateIndexState;
    private refreshIndexState;
    private warnMissingHandlerVersion;
    private warnIncorrectFirstHandler;
    private warnHandlerVersionNonexistent;
    private warnSkippingUpdaters;
}
