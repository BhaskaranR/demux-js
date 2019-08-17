import { AbstractActionReader } from './AbstractActionReader';
import { Block, JsonActionReaderOptions } from './interfaces';
/**
 * Reads from an array of `Block` objects, useful for testing.
 */
export declare class JsonActionReader extends AbstractActionReader {
    blockchain: Block[];
    constructor(options: JsonActionReaderOptions);
    protected setup(): Promise<void>;
    getHeadBlockNumber(): Promise<number>;
    getLastIrreversibleBlockNumber(): Promise<number>;
    getBlock(blockNumber: number): Promise<Block>;
}
