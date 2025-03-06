import {
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  VersionedTransaction,
  TransactionInstruction,
  TransactionMessage,
  ComputeBudgetProgram,
  Transaction,
  sendAndConfirmTransaction,
  Commitment
} from '@solana/web3.js'
import {
  BUY_INTERVAL_MAX,
  BUY_INTERVAL_MIN,
  SELL_INTERVAL_MAX,
  SELL_INTERVAL_MIN,
  BUY_LOWER_PERCENT,
  BUY_UPPER_PERCENT,
  DISTRIBUTE_WALLET_NUM,
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  TOKEN_MINT,
  JITO_MODE,
  SOL_AMOUNT_TO_DISTRIBUTE,
  DISTRIBUTE_INTERVAL_MIN,
  DISTRIBUTE_INTERVAL_MAX,
  COMPUTE_UNIT_PRICE
} from './constants'
import { Data, readJson, saveDataToFile, saveNewFile, sleep } from './utils/utils'
import base58 from 'bs58'
import { getBuyTxWithJupiter, getSellTxWithJupiter } from './utils/swapOnlyAmm'
import { execute } from './executor/legacy'
import { executeJitoTx } from './executor/jito'

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "confirmed"
})

export const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
const baseMint = new PublicKey(TOKEN_MINT)
const distritbutionNum = DISTRIBUTE_WALLET_NUM > 20 ? 20 : DISTRIBUTE_WALLET_NUM
const jitoCommitment: Commitment = "confirmed"

export const startVolumeBot = async () => {
  const solBalance = await solanaConnection.getBalance(mainKp.publicKey)
  console.log(`Volume bot is running`)
  console.log(`Wallet address: ${mainKp.publicKey.toBase58()}`)
  console.log(`Pool token mint: ${baseMint.toBase58()}`)
  console.log(`Wallet SOL balance: ${(solBalance / LAMPORTS_PER_SOL).toFixed(3)}SOL`)
  console.log(`Buying wait time max: ${BUY_INTERVAL_MAX}s`)
  console.log(`Buying wait time min: ${BUY_INTERVAL_MIN}s`)
  console.log(`Selling wait time max: ${SELL_INTERVAL_MAX}s`)
  console.log(`Selling wait time min: ${SELL_INTERVAL_MIN}s`)
  console.log(`Buy upper limit percent: ${BUY_UPPER_PERCENT}%`)
  console.log(`Buy lower limit percent: ${BUY_LOWER_PERCENT}%`)
  console.log(`Distribute SOL to ${distritbutionNum} wallets`)

  if (solBalance < SOL_AMOUNT_TO_DISTRIBUTE * LAMPORTS_PER_SOL) {
    console.log("Sol balance is not enough for distribution")
  }

  // main part
  for (; ;) {
    try {
      console.log("---- New round of distribution ---- \n")

      let data: {
        kp: Keypair;
        buyAmount: number;
      }[] | null = null

      console.log("Distribution wallet num: ", distritbutionNum)
      data = await distributeSol(solanaConnection, mainKp, distritbutionNum)
      if (data == null || data.length == 0) {
        console.log("Distribution failed")
        continue
      }
      const interval = Math.floor((DISTRIBUTE_INTERVAL_MIN + Math.random() * (DISTRIBUTE_INTERVAL_MAX - DISTRIBUTE_INTERVAL_MIN)) * 1000)

      data.map(async ({ kp }, n) => {
        await sleep(Math.round(n * BUY_INTERVAL_MAX / DISTRIBUTE_WALLET_NUM * 1000))
        let srcKp = kp
        // buy part with random percent
        const BUY_WAIT_INTERVAL = Math.round(Math.random() * (BUY_INTERVAL_MAX - BUY_INTERVAL_MIN) + BUY_INTERVAL_MIN)
        const SELL_WAIT_INTERVAL = Math.round(Math.random() * (SELL_INTERVAL_MAX - SELL_INTERVAL_MIN) + SELL_INTERVAL_MIN)
        const solBalance = await solanaConnection.getBalance(srcKp.publicKey)

        let buyAmountInPercent = Number((Math.random() * (BUY_UPPER_PERCENT - BUY_LOWER_PERCENT) + BUY_LOWER_PERCENT).toFixed(3))

        if (solBalance < 8 * 10 ** 6) {
          console.log("Sol balance is not enough in one of wallets")
          return
        }

        let buyAmountFirst = Math.floor((solBalance - 8 * 10 ** 6) / 100 * buyAmountInPercent)
        let buyAmountSecond = Math.floor(solBalance - buyAmountFirst - 8 * 10 ** 6)

        console.log(`balance: ${solBalance / 10 ** 9} first: ${buyAmountFirst / 10 ** 9} second: ${buyAmountSecond / 10 ** 9}`)
        // try buying until success
        let i = 0
        while (true) {
          try {
            if (i > 10) {
              console.log("Error in buy transaction")
              return
            }
            const result = await buy(srcKp, baseMint, buyAmountFirst)
            if (result) {
              break
            } else {
              i++
              await sleep(2000)
            }
          } catch (error) {
            i++
          }
        }

        await sleep(BUY_WAIT_INTERVAL * 1000)

        let l = 0
        while (true) {
          try {
            if (l > 10) {
              console.log("Error in buy transaction")
              throw new Error("Error in buy transaction")
            }
            const result = await buy(srcKp, baseMint, buyAmountSecond)
            if (result) {
              break
            } else {
              l++
              await sleep(2000)
            }
          } catch (error) {
            l++
          }
        }

        await sleep(SELL_WAIT_INTERVAL * 1000)

        // try selling until success
        let j = 0
        while (true) {
          if (j > 10) {
            console.log("Error in sell transaction")
            return
          }
          const result = await sell(baseMint, srcKp)
          if (result) {
            break
          } else {
            j++
            await sleep(2000)
          }
        }

        // SOL transfer part
        const balance = await solanaConnection.getBalance(srcKp.publicKey)
       
        let k = 0
        while (true) {
          try {
            if (k > 3) {
              console.log("Failed to transfer SOL to new wallet in one of sub wallet")
              return
            }
            const baseAta = getAssociatedTokenAddressSync(baseMint, srcKp.publicKey)
            const tx = new Transaction().add(
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COMPUTE_UNIT_PRICE }),
              ComputeBudgetProgram.setComputeUnitLimit({ units: 10_000 }),
              createCloseAccountInstruction(
                baseAta,
                mainKp.publicKey,
                srcKp.publicKey
              ),
              SystemProgram.transfer({
                fromPubkey: srcKp.publicKey,
                toPubkey: mainKp.publicKey,
                lamports: balance
              })
            )

            tx.feePayer = mainKp.publicKey
            tx.recentBlockhash = (await solanaConnection.getLatestBlockhash()).blockhash

            const sig = await sendAndConfirmTransaction(solanaConnection, tx, [srcKp, mainKp], { skipPreflight: true, commitment: "confirmed" })
            console.log(`Gathered SOL back to main wallet, https://solscan.io/tx/${sig}`)

            // filter the keypair that is completed (after this procedure, only keypairs with sol or ata will be saved in data.json)
            const walletsData = readJson()
            const wallets = walletsData.filter(({ privateKey }) => base58.encode(srcKp.secretKey) != privateKey)
            saveNewFile(wallets)
            break
          } catch (error) {
            console.log("Error in gather ")
            k++
          }
        }
      })

      await sleep(interval)

    } catch (error) {
      console.log("Error in one of the steps")
    }
  }
}

const distributeSol = async (connection: Connection, mainKp: Keypair, distritbutionNum: number) => {
  const data: Data[] = []
  const wallets = []
  const kp = base58.encode(mainKp.secretKey)
  /* Sending Sol to sub wallets */
  try {
    const sendSolTx: TransactionInstruction[] = []
    sendSolTx.push(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COMPUTE_UNIT_PRICE }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 12_000 })
    )
    const mainSolBal = await connection.getBalance(mainKp.publicKey)
    if (mainSolBal <= 8 * 10 ** 6 * DISTRIBUTE_WALLET_NUM) {
      console.log("Main wallet balance is not enough")
      return []
    }

    let solAmount = Math.floor(SOL_AMOUNT_TO_DISTRIBUTE * 10 ** 9 / distritbutionNum)

    for (let i = 0; i < distritbutionNum; i++) {
      const wallet = Keypair.generate()
      let lamports = Math.floor(solAmount * (1 - (Math.random() * 0.2)))

      wallets.push({ kp: wallet, buyAmount: solAmount })
      sendSolTx.push(
        SystemProgram.transfer({
          fromPubkey: mainKp.publicKey,
          toPubkey: wallet.publicKey,
          lamports
        })
      )
    }

    wallets.map((wallet) => {
      data.push({
        privateKey: base58.encode(wallet.kp.secretKey),
        pubkey: wallet.kp.publicKey.toBase58(),
      })
    })

    try {
      saveDataToFile(data)
    } catch (error) {
      console.log("DistributeSol tx error")
    }
    try {
      const siTx = new Transaction().add(...sendSolTx)
      const latestBlockhash = await solanaConnection.getLatestBlockhash()
      siTx.feePayer = mainKp.publicKey
      siTx.recentBlockhash = latestBlockhash.blockhash
      const messageV0 = new TransactionMessage({
        payerKey: mainKp.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: sendSolTx,
      }).compileToV0Message()
      const transaction = new VersionedTransaction(messageV0)
      transaction.sign([mainKp])
      let txSig
      if (JITO_MODE) {
        txSig = await executeJitoTx([transaction], mainKp, jitoCommitment)
      } else {
        txSig = await execute(transaction, latestBlockhash, 1)
      }
      if (txSig) {
        const distibuteTx = txSig ? `https://solscan.io/tx/${txSig}` : ''
        console.log("SOL distributed ", distibuteTx)
      }
    } catch (error) {
      console.log("Distribution error")
      return null
    }

    console.log("Success in distribution")
    return wallets
  } catch (error) {
    console.log(`Failed to transfer SOL`)
    return null
  }
}

const buy = async (newWallet: Keypair, baseMint: PublicKey, buyAmount: number) => {
  
  // Missing part here (https://t.me/Takhi777)

}

const sell = async (baseMint: PublicKey, wallet: Keypair) => {
  
  // Missing part here (https://t.me/Takhi777)

}


// main()


