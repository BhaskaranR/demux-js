import * as Logger from 'bunyan'
import {
  ImproperSeekToBlockError,
  ImproperStartAtBlockError,
  ReloadHistoryError,
  UnresolvedForkError,
} from './errors'
import {
  ActionReaderOptions,
  Block,
  BlockInfo,
  BlockMeta,
  NextBlock,
  ReaderInfo,
} from './interfaces'

const defaultBlock: Block = {
  blockInfo: {
    blockNumber: 0,
    blockHash: '',
    previousBlockHash: '',
    timestamp: new Date(0),
  },
  actions: [],
}

/**
 * Reads blocks from a blockchain, outputting normalized `Block` objects.
 */
export abstract class AbstractActionReader {
  public startAtBlock: number
  public headBlockNumber: number = 0
  public currentBlockNumber: number
  protected onlyIrreversible: boolean
  protected currentBlockData: Block = defaultBlock
  protected lastIrreversibleBlockNumber: number = 0
  protected blockHistory: Block[] = []
  protected log: Logger
  protected initialized: boolean = false

  constructor(options: ActionReaderOptions = {}) {
    const optionsWithDefaults = {
      startAtBlock: 1,
      onlyIrreversible: false,
      ...options,
    }
    this.startAtBlock = optionsWithDefaults.startAtBlock
    this.currentBlockNumber = optionsWithDefaults.startAtBlock - 1
    this.onlyIrreversible = optionsWithDefaults.onlyIrreversible

    this.log = Logger.createLogger({ name: 'demux' })
  }

  /**
   * Loads the number of the latest block.
   */
  public abstract async getHeadBlockNumber(): Promise<number>

  /**
   * Loads the number of the most recent irreversible block.
   */
  public abstract async getLastIrreversibleBlockNumber(): Promise<number>

  /**
   * Loads a block with the given block number, returning a promise for a `Block`.
   *
   * @param blockNumber  The number of the block to load
   */
  public abstract async getBlock(blockNumber: number): Promise<Block>

  /**
   * Loads, processes, and returns the next block, updating all relevant state. Return value at index 0 is the `Block`
   * instance; return value at index 1 boolean `isRollback` determines if the implemented `AbstractActionHandler` needs
   * to potentially reverse processed blocks (in the event of a fork); return value at index 2 boolean `isNewBlock`
   * indicates if the `Block` instance returned is the same one that was just returned from the last call of
   * `nextBlock`.
   */
  public async getNextBlock(): Promise<NextBlock> {
    const blockMeta: BlockMeta = {
      isRollback: false,
      isNewBlock: false,
      isEarliestBlock: false,
    }

    this.lastIrreversibleBlockNumber = await this.getLastIrreversibleBlockNumber()

    if (!this.initialized) {
      await this.initialize()
    }

    if (this.currentBlockNumber === this.headBlockNumber) {
      this.headBlockNumber = await this.getLatestNeededBlockNumber()
    }

    if (this.currentBlockNumber < this.headBlockNumber) {
      const unvalidatedBlockData = await this.getBlock(this.currentBlockNumber + 1)

      const expectedHash = this.currentBlockData.blockInfo.blockHash
      const actualHash = this.currentBlockNumber ?
        unvalidatedBlockData.blockInfo.previousBlockHash :
        defaultBlock.blockInfo.blockHash

      if (expectedHash === actualHash) {
        this.acceptBlock(unvalidatedBlockData)
        blockMeta.isNewBlock = true
      } else {
        this.logForkDetected(unvalidatedBlockData, expectedHash, actualHash)
        await this.resolveFork()
        blockMeta.isNewBlock = true
        blockMeta.isRollback = true
        // Reset for safety, as new fork could have less blocks than the previous fork
        this.headBlockNumber = await this.getLatestNeededBlockNumber()
      }
    }

    blockMeta.isEarliestBlock = this.currentBlockNumber === this.startAtBlock

    return {
      block: this.currentBlockData,
      blockMeta,
      lastIrreversibleBlockNumber: this.lastIrreversibleBlockNumber,
    }
  }

  /**
   * Performs all required initialization for the reader.
   */
  public async initialize(): Promise<void> {
    await this.setup()
    await this.initBlockState()
    this.initialized = true
  }

  /**
   * Changes the state of the `AbstractActionReader` instance to have just processed the block at the given block
   * number. If the block exists in its temporary block history, it will use this, otherwise it will fetch the block
   * using `getBlock`.
   *
   * The next time `nextBlock()` is called, it will load the block after this input block number.
   */
  public async seekToBlock(blockNumber: number): Promise<void> {
    this.headBlockNumber = await this.getLatestNeededBlockNumber()
    if (blockNumber < this.startAtBlock) {
      throw new ImproperStartAtBlockError()
    }
    if (blockNumber > this.headBlockNumber) {
      throw new ImproperSeekToBlockError(blockNumber)
    }
    this.currentBlockNumber = blockNumber - 1
    await this.reloadHistory()
  }

  /**
   * Information about the current state of the Action Reader
   */
  public get info(): ReaderInfo {
    return {
      currentBlockNumber: this.currentBlockNumber,
      startAtBlock: this.startAtBlock,
      headBlockNumber: this.headBlockNumber,
      onlyIrreversible: this.onlyIrreversible,
      lastIrreversibleBlockNumber: this.lastIrreversibleBlockNumber,
    }
  }

  /**
   * Idempotently performs any required setup.
   */
  protected abstract async setup(): Promise<void>

  /**
   * Incrementally rolls back reader state one block at a time, comparing the blockHistory with
   * newly fetched blocks. Fork resolution is finished when either the current block's previous hash
   * matches the previous block's hash, or when history is exhausted.
   */
  protected async resolveFork() {
    if (this.blockHistory.length === 0) {
      await this.addPreviousBlockToHistory()
    }

    // Pop off blocks from cached block history and compare them with freshly fetched blocks
    while (this.blockHistory.length > 0) {
      if (this.blockHistory.length === 0) {
        await this.addPreviousBlockToHistory()
      }
      const [previousBlockData] = this.blockHistory.slice(-1)
      this.log.info(`Refetching Block ${this.currentBlockData.blockInfo.blockNumber}...`)
      this.currentBlockData = await this.getBlock(this.currentBlockData.blockInfo.blockNumber)
      const { blockInfo: currentBlockInfo } = this.currentBlockData
      const { blockInfo: previousBlockInfo } = previousBlockData
      if (currentBlockInfo.previousBlockHash === previousBlockInfo.blockHash) {
        this.logForkResolved(currentBlockInfo, previousBlockInfo)
        break
      }
      this.logForkMismatch(currentBlockInfo, previousBlockInfo)

      this.currentBlockData = previousBlockData
      this.blockHistory.pop()
    }

    if (this.blockHistory.length === 0) {
      await this.addPreviousBlockToHistory()
    }

    this.currentBlockNumber = this.blockHistory[this.blockHistory.length - 1].blockInfo.blockNumber + 1
  }

  private async initBlockState() {
    this.lastIrreversibleBlockNumber = await this.getLastIrreversibleBlockNumber()
    this.headBlockNumber = await this.getLatestNeededBlockNumber()
    if (this.currentBlockNumber < 0) {
      this.currentBlockNumber = this.headBlockNumber + this.currentBlockNumber
      this.startAtBlock = this.currentBlockNumber + 1
    }
    await this.reloadHistory()
  }

  private async getLatestNeededBlockNumber() {
    if (this.onlyIrreversible) {
      return this.lastIrreversibleBlockNumber
    } else {
      return this.getHeadBlockNumber()
    }
  }

  private acceptBlock(blockData: Block) {
    this.blockHistory.push(this.currentBlockData)
    this.pruneHistory()
    this.currentBlockData = blockData
    this.currentBlockNumber = this.currentBlockData.blockInfo.blockNumber
  }

  private range(start: number, end: number): number[] {
    if (start > end) {
      return []
    }
    return Array(end - start).fill(0).map((_, i: number) => i + start)
  }

  private pruneHistory() {
    let toDelete = 0
    for (const block of this.blockHistory) {
      if (block.blockInfo.blockNumber < this.lastIrreversibleBlockNumber) {
        toDelete += 1
      } else {
        break
      }
    }
    if (toDelete === this.blockHistory.length) {
      this.blockHistory = [this.blockHistory[this.blockHistory.length - 1]]
      return
    }
    this.blockHistory.splice(0, toDelete)
  }

  private async reloadHistory(maxTries = 10) {
    if (this.currentBlockNumber === 0) {
      this.blockHistory = []
      this.currentBlockData = defaultBlock
      return
    }
    if (this.currentBlockNumber === 1) {
      this.blockHistory = [defaultBlock]
      this.currentBlockData = await this.getBlock(1)
      return
    }
    let historyRange = this.range(this.lastIrreversibleBlockNumber, this.currentBlockNumber + 1)
    if (historyRange.length <= 1) {
      historyRange = [this.currentBlockNumber - 1, this.currentBlockNumber]
    }
    let microForked = true
    let tryCount = 0
    while (microForked) {
      microForked = false
      this.blockHistory = []
      for (const blockNumber of historyRange) {
        const historyBlock = await this.getBlock(blockNumber)
        if (this.blockHistory.length === 0) {
          this.blockHistory.push(historyBlock)
          continue
        }
        const latestHistoryBlockHash = this.blockHistory[this.blockHistory.length - 1].blockInfo.blockHash
        if (latestHistoryBlockHash !== historyBlock.blockInfo.previousBlockHash) {
          microForked = true
          break
        }
        this.blockHistory.push(historyBlock)
      }
      tryCount += 1
      if (tryCount === maxTries) {
        throw new ReloadHistoryError()
      }
    }
    this.currentBlockData = this.blockHistory.pop()!
  }

  private async addPreviousBlockToHistory(checkIrreversiblility: boolean = true) {
    if (this.currentBlockData.blockInfo.blockNumber < this.lastIrreversibleBlockNumber && checkIrreversiblility) {
      throw new UnresolvedForkError()
    }
    this.blockHistory.push(await this.getBlock(this.currentBlockData.blockInfo.blockNumber - 1))
  }

  private logForkDetected(unvalidatedBlockData: Block, expectedHash: string, actualHash: string) {
    this.log.info('!! FORK DETECTED !!')
    this.log.info(`  MISMATCH:`)
    this.log.info(`    ✓ NEW Block ${unvalidatedBlockData.blockInfo.blockNumber} previous: ${actualHash}`)
    this.log.info(`    ✕ OLD Block ${this.currentBlockNumber} id:       ${expectedHash}`)
  }

  private logForkResolved(currentBlockInfo: BlockInfo, previousBlockInfo: BlockInfo) {
    this.log.info('  MATCH:')
    this.log.info(`    ✓ NEW Block ${currentBlockInfo.blockNumber} previous: ${currentBlockInfo.previousBlockHash}`) // tslint:disable-line
    this.log.info(`    ✓ OLD Block ${previousBlockInfo.blockNumber} id:       ${previousBlockInfo.blockHash}`)
    this.log.info('!! FORK RESOLVED !!')
  }

  private logForkMismatch(currentBlockInfo: BlockInfo, previousBlockInfo: BlockInfo) {
    this.log.info('  MISMATCH:')
    this.log.info(`    ✓ NEW Block ${currentBlockInfo.blockNumber} previous: ${currentBlockInfo.previousBlockHash}`)
    this.log.info(`    ✕ OLD Block ${previousBlockInfo.blockNumber} id:       ${previousBlockInfo.blockHash}`)
  }
}
