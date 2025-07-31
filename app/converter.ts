import { MerklePath } from '@bsv/sdk'

const example = {
    target: '1292398342893238494843899343434903094',
    type: 'blockhash',
    height: 800000,
    index: '',
    txOrId: 'txidofthething',
    nodes: ['hash1', 'hash2', 'etc.']
}

export default function convertTSCtoBUMP(tsc) {
    if (tsc.type !== 'blockhash') throw Error('only handles blockhash target types')
    if (!tsc.txOrId || tsc.length !== 64) throw Error('txOrId must be a 64 character hex string')
    const bump = new MerklePath()
    bump.blockHeight = tsc.height
    let index = tsc.index
    let offset = 0
    while (tsc.nodes.length > 0) {
        if (index % 2) offset = index + 1
        else offset = index - 1
        bump.path.push([{ hash: tsc.nodes.shift(), offset }])
        treeHeight--
        index >> 1
    }
    bump.path[0].push({ txid: true, hash: tsc.txid, offset: tsc.index })
    bump.path.map(level => level.map(element => {
        if (element.hash === '*') {
            element.duplicate = true
            delete element.hash
        }
    }))
    bump.computeRoot(tsc.txid)
    return bump
}