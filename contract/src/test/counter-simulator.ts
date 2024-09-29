import { type CircuitContext, QueryContext, sampleContractAddress } from '@midnight-ntwrk/compact-runtime';
import { Contract, type Ledger, ledger } from '../managed/counter/contract/index.cjs';
import { type CounterPrivateState, witnesses } from '../witnesses.js';

// This is over-kill for such a simple contract, but the same pattern can be used to test more
// complex contracts.
export class CounterSimulator {
  readonly contract: Contract<CounterPrivateState>;
  circuitContext: CircuitContext<CounterPrivateState>;

  constructor() {
    this.contract = new Contract<CounterPrivateState>(witnesses);
    const [initialPrivateState, initialContractState] = this.contract.initialState({});
    this.circuitContext = {
      currentPrivateState: initialPrivateState,
      originalState: initialContractState,
      transactionContext: new QueryContext(initialContractState.data, sampleContractAddress()),
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.transactionContext.state);
  }

  public getPrivateState(): CounterPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public increment(): Ledger {
    // Update the current context to be the result of executing the circuit.
    this.circuitContext = this.contract.impureCircuits.increment(this.circuitContext).context;
    return ledger(this.circuitContext.transactionContext.state);
  }
}
