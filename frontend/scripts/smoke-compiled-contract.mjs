import { CompiledContract, ContractExecutable } from '@midnight-ntwrk/compact-js';

import * as VeilMarkContract from '../../managed/private-progress-counter/contract/index.js';

const witnesses = {
  localSecret: ({ privateState }) => [privateState, new Uint8Array(32)],
};

const compiledContract = CompiledContract.make(
  'private-progress-counter',
  VeilMarkContract.Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('../managed/private-progress-counter'),
);

const circuitIds = ContractExecutable.make(compiledContract).getProvableCircuitIds();

if (!circuitIds.includes('recordPrivateProgress')) {
  throw new Error('Compiled contract does not expose recordPrivateProgress.');
}

console.log('Compiled contract smoke check passed: recordPrivateProgress is executable.');
