import { AbstractActionReader } from '../AbstractActionReader';
import { Block } from '../interfaces';
export declare class TestActionReader extends AbstractActionReader {
    isInitialized: boolean;
    blockchain: Block[];
    _testLastIrreversible: number;
    readonly _blockHistory: Block[];
    readonly _lastIrreversibleBlockNumber: number;
    getHeadBlockNumber(): Promise<number>;
    getLastIrreversibleBlockNumber(): Promise<number>;
    getBlock(blockNumber: number): Promise<Block>;
    protected setup(): Promise<void>;
}
