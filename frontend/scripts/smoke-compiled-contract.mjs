import { CompiledContract, ContractExecutable } from '@midnight-ntwrk/compact-js';

import * as VeilMarkContract from '../../managed/private-progress-counter/contract/index.js';

const witnesses = {
  localSecret: ({ privateState }) => [privateState, new Uint8Array(32)],
  privateResponse: ({ privateState }) => [privateState, new Uint8Array(32)],
};

const compiledContract = CompiledContract.make(
  'private-progress-counter',
  VeilMarkContract.Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('../managed/private-progress-counter'),
);

const circuitIds = ContractExecutable.make(compiledContract).getProvableCircuitIds();

if (!circuitIds.includes('submitAnonymousPulse')) {
  throw new Error('Compiled contract does not expose submitAnonymousPulse.');
}

console.log('Compiled contract smoke check passed: submitAnonymousPulse is executable.');
