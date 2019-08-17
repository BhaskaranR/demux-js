/// <reference types="bunyan" />
import { Logger } from './BunyanProvider';
import { ActionReader, ActionReaderOptions, Block, NextBlock, ReaderInfo } from './interfaces';
/**
 * Reads blocks from a blockchain, outputting normalized `Block` objects.
 */
export declare abstract class AbstractActionReader implements ActionReader {
    protected startAtBlock: number;
    protected headBlockNumber: number;
    protected currentBlockNumber: number;
    protected onlyIrreversible: boolean;
    protected currentBlockData: Block;
    protected lastIrreversibleBlockNumber: number;
    protected blockHistory: Block[];
    protected log: Logger;
    protected initialized: boolean;
    constructor(options?: ActionReaderOptions);
    /**
     * Loads, processes, and returns the next block, updating all relevant state. Return value at index 0 is the `Block`
     * instance; return value at index 1 boolean `isRollback` determines if the implemented `AbstractActionHandler` needs
     * to potentially reverse processed blocks (in the event of a fork); return value at index 2 boolean `isNewBlock`
     * indicates if the `Block` instance returned is the same one that was just returned from the last call of
     * `nextBlock`.
     */
    getNextBlock(): Promise<NextBlock>;
    /**
     * Performs all required initialization for the reader.
     */
    initialize(): Promise<void>;
    /**
     * Changes the state of the `AbstractActionReader` instance to have just processed the block at the given block
     * number. If the block exists in its temporary block history, it will use this, otherwise it will fetch the block
     * using `getBlock`.
     *
     * The next time `nextBlock()` is called, it will load the block after this input block number.
     */
    seekToBlock(blockNumber: number): Promise<void>;
    /**
     * Information about the current state of the Action Reader
     */
    readonly info: ReaderInfo;
    /**
     * Loads the number of the latest block.
     */
    protected abstract getHeadBlockNumber(): Promise<number>;
    /**
     * Loads the number of the most recent irreversible block.
     */
    protected abstract getLastIrreversibleBlockNumber(): Promise<number>;
    /**
     * Loads a block with the given block number, returning a promise for a `Block`.
     *
     * @param blockNumber  The number of the block to load
     */
    protected abstract getBlock(blockNumber: number): Promise<Block>;
    /**
     * Idempotently performs any required setup.
     */
    protected abstract setup(): Promise<void>;
    /**
     * Incrementally rolls back reader state one block at a time, comparing the blockHistory with
     * newly fetched blocks. Fork resolution is finished when either the current block's previous hash
     * matches the previous block's hash, or when history is exhausted.
     */
    protected resolveFork(): Promise<void>;
    private initBlockState;
    private getLatestNeededBlockNumber;
    private acceptBlock;
    private range;
    private pruneHistory;
    private reloadHistory;
    private addPreviousBlockToHistory;
    private loggedGetBlock;
    private logForkDetected;
    private logForkResolved;
    private logForkMismatch;
}
