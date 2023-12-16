import axios from 'axios'

const base = axios.create({ baseURL: 'https://api.s0.t.hmny.io' })

const CurrentEpoch: number = Number(process.env.CURRENT_EPOCH ?? 0x6c4)

async function checkDelegations (validator: string): Promise<any> {
  const { data: { result: { validator: { delegations } } } } = await base.post('/', {
    jsonrpc: '2.0',
    method: 'hmyv2_getValidatorInformation',
    params: [validator],
    id: 1
  })
  const badDelegations = delegations.filter((d: any) => d.undelegations.filter((e: any) => e.epoch < CurrentEpoch - 7).length >= 1)
  const recentUndelegations = delegations.filter((d: any) => d.undelegations.filter((e: any) => e.epoch > CurrentEpoch - 7).length >= 1)
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
        const amount = Number(BigInt(u.amount) * BigInt(1e+6) / (BigInt(10) ** BigInt(18))) / 1e+6
        perEpochAmount += amount
        mintedSum += (CurrentEpoch - (Number(u.epoch) + 7)) * amount
      }
      validatorPerEpochAmount += perEpochAmount
      validatorMintedSum += mintedSum
      const since = badDelegation.undelegations.reduce((u1: any, u2: any) => u1.epoch < u2.epoch ? u1.epoch : u2.epoch, CurrentEpoch)
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
