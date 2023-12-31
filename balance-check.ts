import axios from 'axios'
import assert from 'node:assert'
import { calcEpochNumber, epochLastBlock, formatBalance } from './common'

const base = axios.create({ baseURL: 'https://a.api.s0.t.hmny.io' })

const Address = process.env.ADDRESS ?? '0x18A5Af69DfC02dc950f7534Ae97A180F34B75d7a'
const FromBlock = Number(process.env.CURRENT_EPOCH ?? 50465369)
const ToBlock = Number(process.env.CURRENT_EPOCH ?? 51213292)

const getBalance = async (b: number): Promise<bigint> => {
  const { data: { result } } = await base.post('/', {
    jsonrpc: '2.0',
    method: 'eth_getBalance',
    params: [
      Address,
      b
    ],
    id: 1
  })
  // console.log(b, formatBalance(BigInt(result)))
  return BigInt(result)
}

const computeDiffBalance = async (b: number): Promise<bigint> => {
  const b0 = await getBalance(b - 1)
  const b1 = await getBalance(b)
  return b1 - b0
}
async function main (): Promise<any> {
  const fromEpoch = calcEpochNumber(FromBlock)
  const fromEpochBoundaryBlock = epochLastBlock(fromEpoch)
  let b = fromEpochBoundaryBlock
  let ep = fromEpoch
  let sum = 0n
  while (b < ToBlock) {
    const diff = await computeDiffBalance(b)
    const blockEpoch = calcEpochNumber(b)
    assert(blockEpoch === ep, `blockEpoch=${blockEpoch}, ep=${ep}`)
    sum += diff
    console.log(`Epoch ${blockEpoch} block ${b} balance-diff ${diff}`)
    b += 32768
    ep += 1
  }
  console.log('Total sum (including legitimate undelegation)', formatBalance(sum))
}

main().catch(console.error)
