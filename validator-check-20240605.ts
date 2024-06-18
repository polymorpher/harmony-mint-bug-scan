import axios from 'axios'
import { calcEpochNumber, formatBalance, formatUndelegations } from './common'
const base = axios.create({ baseURL: 'https://a.api.s0.t.hmny.io/' })

let BlockNumber = Number(process.env.BLOCK_NUMBER ?? 0)
let BlockNumberHex = BlockNumber ? ('0x' + Number(BlockNumber).toString(16)) : '0x0'
const HIDE_ZERO_DELEGATION = !!process.env.HIDE_ZERO_DELEGATION

async function getLatestBlockNumber (): Promise<number> {
  const { data: { result } } = await base.post('/', {
    jsonrpc: '2.0',
    method: 'hmyv2_getStakingNetworkInfo',
    params: [],
    id: 1
  })
  return Number(result['epoch-last-block'])
}

async function checkDelegations20240625 (validator: string): Promise<void> {
  const { data } = await base.post('/', {
    jsonrpc: '2.0',
    method: 'hmyv2_getValidatorInformationByBlockNumber',
    params: [validator, BlockNumberHex],
    id: 1
  })
  // console.log(data)
  const { validator: { delegations } } = data.result
  const currentEpoch = calcEpochNumber(BlockNumber)
  const badDelegations = delegations.filter((d: any) =>
    (!HIDE_ZERO_DELEGATION && d.amount > 0) &&
      d.undelegations.filter((e: any) => e.epoch <= (currentEpoch - 1) - 7).length >= 1
  )
  if (badDelegations.length) {
    console.log(`Validator [${validator}] Bad undelegations:`)
    for (const bd of badDelegations) {
      console.log(`  - delegator: ${bd['delegator-address']}: delegated amount ${formatBalance(BigInt(bd.amount), 1000000000000000n)} undelegations: ${formatUndelegations(bd.undelegations)}`)
      // console.log(`  - delegator: ${bd['delegator-address']}: delegated amount ${bd.amount} undelegations: ${formatUndelegations(bd.undelegations)}`)
    }
  }
}

async function main (): Promise<any> {
  if (BlockNumber === 0) {
    BlockNumber = (await getLatestBlockNumber()) - 32768
    BlockNumberHex = '0x' + Number(BlockNumber).toString(16)
    console.log(`Using current block number - 32768: ${BlockNumber} (${BlockNumberHex})`)
  }
  const { data: { result: validators } } = await base.post('/', {
    jsonrpc: '2.0',
    method: 'hmy_getAllValidatorAddresses',
    params: [],
    id: 1
  })
  console.log('validators', validators)
  for (const v of (validators as string[])) {
    await checkDelegations20240625(v)
  }
}

main().catch(console.error)
