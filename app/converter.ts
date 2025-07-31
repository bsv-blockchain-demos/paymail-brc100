import { MerklePath } from '@bsv/sdk'

interface TSCData {
    target: string;
    type: string;
    height: number;
    index: number;
    txOrId: string;
    txid: string;
    nodes: string[];
}

const example: TSCData = {
    target: '1292398342893238494843899343434903094',
    type: 'blockhash',
    height: 800000,
    index: 0,
    txOrId: 'txidofthething',
    txid: 'txidofthething',
    nodes: ['hash1', 'hash2', 'etc.']
}

export default function convertTSCtoBUMP(tsc: TSCData): MerklePath {
    if (tsc.type !== 'blockhash') throw Error('only handles blockhash target types')
    if (!tsc.txOrId || tsc.txOrId.length !== 64) throw Error('txOrId must be a 64 character hex string')
    const bump = new MerklePath(tsc.height, [])
    let index = tsc.index
    let offset = 0
    let treeHeight = Math.ceil(Math.log2(tsc.nodes.length + 1))
    while (tsc.nodes.length > 0) {
        if (index % 2) offset = index + 1
        else offset = index - 1
        const node = tsc.nodes.shift()
        if (node) {
            bump.path.push([{ hash: node, offset }])
        }
        treeHeight--
        index = index >> 1
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