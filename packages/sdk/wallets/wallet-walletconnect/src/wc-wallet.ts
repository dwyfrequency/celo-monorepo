import { RemoteWallet } from '@celo/wallet-remote'
import WalletConnect, { CLIENT_EVENTS } from '@walletconnect/client'
import { PairingTypes, SessionTypes } from '@walletconnect/types'
import { WalletConnectSigner } from './wc-signer'

export enum RpcWalletErrors {
  FetchAccounts = 'RpcWallet: failed to fetch accounts from server',
  AccountAlreadyExists = 'RpcWallet: account already exists',
}

/*
 *   WARNING: This class should only be used with well-permissioned providers (ie IPC)
 *   to avoid sensitive user 'privateKey' and 'passphrase' information being exposed
 */
export class WalletConnectWallet extends RemoteWallet<WalletConnectSigner> {
  private metadata: any
  private onUri: any

  constructor(onUri: (x: string) => void, metadata: any) {
    super()

    this.onUri = onUri
    this.metadata = metadata
  }

  onSessionProposal = (proposal: SessionTypes.Proposal) => {
    console.log('onSessionProposal', proposal)
  }
  onSessionCreated = (session: SessionTypes.Created) => {
    console.log('onSessionCreated', session)
  }
  onSessionUpdated = (session: SessionTypes.Update) => {
    console.log('onSessionUpdated', session)
  }
  onSessionDeleted = (session: SessionTypes.DeleteParams) => {
    console.log('onSessionDeleted', session)
  }

  onPairingProposal = (pairing: PairingTypes.Proposal) => {
    console.log('onPairingProposal', pairing, this)
    this.onUri(pairing.signal.params.uri)
  }
  onPairingCreated = (pairing: PairingTypes.Created) => {
    console.log('onPairingCreated', pairing)
  }
  onPairingUpdated = (pairing: PairingTypes.Update) => {
    console.log('onPairingUpdated', pairing)
  }
  onPairingDeleted = (pairing: PairingTypes.DeleteParams) => {
    console.log('onPairingDeleted', pairing)
  }

  async loadAccountSigners(): Promise<Map<string, WalletConnectSigner>> {
    const addressToSigner = new Map<string, WalletConnectSigner>()

    const client = await WalletConnect.init({
      relayProvider: 'wss://staging.walletconnect.org',
    })
    client.on(CLIENT_EVENTS.session.proposal, this.onSessionProposal)
    client.on(CLIENT_EVENTS.session.created, this.onSessionCreated)
    client.on(CLIENT_EVENTS.session.updated, this.onSessionUpdated)
    client.on(CLIENT_EVENTS.session.deleted, this.onSessionDeleted)

    client.on(CLIENT_EVENTS.pairing.proposal, this.onPairingProposal)
    client.on(CLIENT_EVENTS.pairing.created, this.onPairingCreated)
    client.on(CLIENT_EVENTS.pairing.updated, this.onPairingUpdated)
    client.on(CLIENT_EVENTS.pairing.deleted, this.onPairingDeleted)

    return new Promise(async (resolve) => {
      const session = await client.connect({
        metadata: this.metadata,
        permissions: {
          blockchain: {
            chains: ['celo:44787'],
          },
          jsonrpc: {
            methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData'],
          },
        },
      })

      session.state.accounts.forEach((accountWithChain) => {
        const [account] = accountWithChain.split('@')
        const signer = new WalletConnectSigner(client, session, account)
        addressToSigner.set(account, signer)
      })

      resolve(addressToSigner)
    })
  }
}
