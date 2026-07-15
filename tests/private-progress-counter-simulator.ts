import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type CircuitContext,
} from '@midnight-ntwrk/compact-runtime';

import {
  Contract,
  ledger,
  type Ledger,
} from '../managed/private-progress-counter/contract/index.js';
import {
  createPrivateProgressState,
  createPrivateProgressWitnesses,
  type PrivateProgressPrivateState,
} from '../src/witnesses.js';

export class PrivateProgressSimulator {
  readonly contract: Contract<PrivateProgressPrivateState>;
  circuitContext: CircuitContext<PrivateProgressPrivateState>;

  constructor(secret: Uint8Array) {
    this.contract = new Contract<PrivateProgressPrivateState>(createPrivateProgressWitnesses());
    const initial = this.contract.initialState(
      createConstructorContext(createPrivateProgressState(secret), '0'.repeat(64)),
    );

    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      initial.currentZswapLocalState,
      initial.currentContractState,
      initial.currentPrivateState,
    );
  }

  getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  getPrivateState(): PrivateProgressPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  recordPrivateProgress(period: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.recordPrivateProgress(this.circuitContext, period).context;
    return this.getLedger();
  }
}
