import { KeyDeriver, PrivateKey } from "@bsv/sdk"
import { WalletStorageManager, WalletSigner, Services, Wallet, StorageClient } from '@bsv/wallet-toolbox-client'

export async function makeWallet(chain: 'main' | 'test', storageURL: string, privateKey: string) {
    const keyDeriver = new KeyDeriver(new PrivateKey(privateKey, 'hex'));
    const storageManager = new WalletStorageManager(keyDeriver.identityKey);
    const signer = new WalletSigner(chain, keyDeriver, storageManager);
    const services = new Services(chain);
    const wallet = new Wallet(signer, services);
    const client = new StorageClient(wallet, storageURL);
    await client.makeAvailable();
    await storageManager.addWalletStorageProvider(client);
    return wallet;
}
