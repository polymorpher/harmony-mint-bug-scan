export const TwoSecondsEpoch = 366
export const TwoSecondsFirstBlock = (TwoSecondsEpoch - 1) * 16384 + 344064

export const calcEpochNumber = (b: number): number => Math.floor((b - TwoSecondsFirstBlock) / 32768) + TwoSecondsEpoch
export const epochLastBlock = (e: number): number => (e - TwoSecondsEpoch + 1) * 32768 + TwoSecondsFirstBlock - 1

const PrecisionFactor: bigint = 100000000n

export const formatBalance = (balance: bigint, precision: bigint = PrecisionFactor): number => {
  return Number(balance * precision / (10n ** 18n)) / Number(precision)
}

export const formatUndelegation = (ud: any): string => {
  return `${formatBalance(BigInt(ud.amount))} @ ${ud.epoch}}`
}
export const formatUndelegations = (uds: any[]): string => {
  return uds.map(ud => formatUndelegation(ud)).join(' | ')
}
