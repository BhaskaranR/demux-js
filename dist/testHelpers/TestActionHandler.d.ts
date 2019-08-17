import { AbstractActionHandler } from '../AbstractActionHandler';
import { IndexState, NextBlock, VersionedAction } from '../interfaces';
export declare class TestActionHandler extends AbstractActionHandler {
    isInitialized: boolean;
    private indexState;
    state: any;
    private hashHistory;
    readonly _handlerVersionName: string;
    handleWithState(handle: (state: any) => void): Promise<void>;
    rollbackTo(blockNumber: number): Promise<void>;
    setLastProcessedBlockHash(hash: string): void;
    setLastProcessedBlockNumber(num: number): void;
    _applyUpdaters(state: any, nextBlock: NextBlock, context: any, isReplay: boolean): Promise<VersionedAction[]>;
    _runEffects(versionedActions: VersionedAction[], context: any, nextBlock: NextBlock): Promise<void>;
    protected loadIndexState(): Promise<IndexState>;
    handleBlock(nextBlock: NextBlock, isReplay: boolean): Promise<number | null>;
    protected updateIndexState(state: any, nextBlock: NextBlock, isReplay: boolean, handlerVersionName: string): Promise<void>;
    protected setup(): Promise<void>;
}
