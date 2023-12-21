import axios from 'axios'
import { calcEpochNumber, formatBalance } from './common'

const base = axios.create({ baseURL: 'https://a.api.s0.t.hmny.io/' })

const BlockNumber = Number(process.env.BLOCK_NUMBER ?? 51085312)
const BlockEpoch: number = calcEpochNumber(BlockNumber)

async function checkDelegations (validator: string): Promise<any> {
  const { data: { result: { validator: { delegations } } } } = await base.post('/', {
    jsonrpc: '2.0',
    method: 'hmyv2_getValidatorInformationByBlockNumber',
    params: [validator, BlockNumber],
    id: 1
  })
  // use BlockEpoch - 1 because the undelegation payout for BlockEpoch has not been paid, i.e. if undelegation is at 1720, and BlockEpoch is 1727, the payout for the undelegation is paid at the begining of epoch 1728. So "bad" undelegation for BlockEpoch 1727 has to be at most 1719
  const badDelegations = delegations.filter((d: any) => d.undelegations.filter((e: any) => e.epoch <= (BlockEpoch - 1) - 7).length >= 1)
  // similarly, recentUndelegations gives us a warning of upcoming bad undelegations. We used this to get an idea ahead of time of any increase in potential damage per day
  const recentUndelegations = delegations.filter((d: any) => d.undelegations.filter((e: any) => e.epoch > (BlockEpoch - 1) - 7).length >= 1)
  let validatorMintedSum = 0
  let validatorPerEpochAmount = 0
  if (badDelegations.length >= 1) {
    for (const badDelegation of badDelegations) {
      // if (badDelegation['delegator-address'] === 'one1rzj676wlcqkuj58h2d9wj7scpu6twht6qqvw54') {
      //   continue
      // }
      let mintedSum = 0
      let perEpochAmount = 0
      for (const u of badDelegation.undelegations as any[]) {
        const amount = formatBalance(BigInt(u.amount))
        perEpochAmount += amount
        // for epochs between [Number(u.epoch) + 7, BlockEpoch - 1] inclusive, undelegation payouts were made. However, the first undelegation at `Number(u.epoch) + 7` is a legitimate payout, thus the calculation should subtract one epoch
        mintedSum += ((BlockEpoch - 1) - (Number(u.epoch) + 7) + 1 - 1) * amount
      }
      validatorPerEpochAmount += perEpochAmount
      validatorMintedSum += mintedSum
      const since = badDelegation.undelegations.reduce((u1: any, u2: any) => u1.epoch < u2.epoch ? u1.epoch : u2.epoch, BlockEpoch)
      console.log('Bad delegations from validator', validator, 'amount per epoch', perEpochAmount, 'minted sum', mintedSum, 'since', since, 'bad delegations', JSON.stringify(badDelegation))
    }
    console.log(`Validator ${validator} total minted sum: ${validatorMintedSum} , per epoch amount: ${validatorPerEpochAmount}`)
  } else {
    console.log('No bad delegations from validator', validator)
  }
  if (recentUndelegations.length > 0) {
    for (const ru of recentUndelegations) {
      for (const u of ru.undelegations as any[]) {
        const amount = Number(BigInt(u.amount) * BigInt(1e+6) / (BigInt(10) ** BigInt(18))) / 1e+6
        console.log('WARNING: Recent undelegation from validator', validator, 'amount', amount, 'epoch', u.epoch, 'delegator', ru['delegator-address'])
      }
    }
  }
}
async function main (): Promise<any> {
  const { data: { result: validators } } = await base.post('/', {
    jsonrpc: '2.0',
    method: 'hmy_getAllValidatorAddresses',
    params: [],
    id: 1
  })
  console.log('validators', validators)
  for (const v of (validators as string[])) {
    await checkDelegations(v)
  }
}

main().catch(console.error)

// checkDelegations('0xE5b2B811Da362F5a63Bc09fb14925Bc17C6880A7').catch(console.error)

// don
// checkDelegations('one1qv82h8dzjmm09tqwdwe3evjgmzz84fqmqskkzk').catch(console.error)

// tr4
// checkDelegations('one1rxdtt9fvgdcy3n5sy6e4zxg0s4hn4shaqf4qtp').catch(console.error)

// Husaria
// checkDelegations('one1xrtkrcpx7edw40zxpp26up939gc68u8hwepvnx').catch(console.error)
