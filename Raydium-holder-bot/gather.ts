import base58 from "bs58"
import { readJson, readSettings, retrieveEnvVariable, saveNewFile, sleep } from "./src/utils"
import { ComputeBudgetProgram, Connection, Keypair, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js"
import { NATIVE_MINT, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress, getMinimumBalanceForRentExemptAccount, getMint } from "@solana/spl-token";
import { Liquidity, LiquidityPoolInfo, LiquidityPoolKeysV4, SPL_ACCOUNT_LAYOUT, TokenAccount } from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
import { mainMenuWaiting } from ".";
import { COMPUTE_UNIT_PRICE, mainWallet, solanaConnection } from "./config";
import { derivePoolKeys } from "./src/poolAll";

export const sellTokens = async () => {
  const walletsStr = readJson()
  const wallets = walletsStr.map(walletStr => Keypair.fromSecretKey(base58.decode(walletStr)))

  let data = readSettings()
  const baseMint = new PublicKey(data.mint!)
  const poolId = new PublicKey(data.poolId!)

  let tokenAccountRent: number | null = null;
  let decimal: number | null = null;
  let poolKeys: LiquidityPoolKeysV4 | null = null;
  let poolInfo: LiquidityPoolInfo | null = null;

  if (!tokenAccountRent)
    tokenAccountRent = await getMinimumBalanceForRentExemptAccount(solanaConnection);
  if (!decimal)
    decimal = (await getMint(solanaConnection, baseMint)).decimals;
  if (!poolKeys) {
    poolKeys = await derivePoolKeys(new PublicKey(poolId))
    if (!poolKeys) {
      console.log("Pool keys is not derived")
      return
    }
  }

  wallets.map(async (kp, i) => {
    try {
      await sleep(i * 100)

      const accountInfo = await solanaConnection.getAccountInfo(kp.publicKey)

      const quoteAta = await getAssociatedTokenAddress(NATIVE_MINT, kp.publicKey);
      const baseAta = await getAssociatedTokenAddress(baseMint, kp.publicKey);
      const amountOut = (await solanaConnection.getTokenAccountBalance(baseAta)).value.amount

      const { innerTransaction: innerSellIxs } = Liquidity.makeSwapFixedInInstruction(
        {
          poolKeys: poolKeys,
          userKeys: {
            tokenAccountIn: baseAta,
            tokenAccountOut: quoteAta,
            owner: kp.publicKey,
          },
          amountIn: amountOut,
          minAmountOut: 0,
        },
        poolKeys.version,
      );

      const ixs: TransactionInstruction[] = []
      if (accountInfo) {
        const solBal = await solanaConnection.getBalance(kp.publicKey)
        ixs.push(
          ...innerSellIxs.instructions,
          createCloseAccountInstruction(
            baseAta,
            mainWallet.publicKey,
            kp.publicKey
          ),
          createCloseAccountInstruction(
            quoteAta,
            mainWallet.publicKey,
            kp.publicKey
          ),
          SystemProgram.transfer({
            fromPubkey: kp.publicKey,
            toPubkey: mainWallet.publicKey,
            lamports: solBal
          })
        )
      }

      // console.log('----------------------')
      if (ixs.length) {
        const tx = new Transaction().add(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COMPUTE_UNIT_PRICE }),
          ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }),
          ...ixs,
        )
        tx.feePayer = mainWallet.publicKey
        tx.recentBlockhash = (await solanaConnection.getLatestBlockhash()).blockhash
        console.log(await solanaConnection.simulateTransaction(tx))
        const sig = await sendAndConfirmTransaction(solanaConnection, tx, [mainWallet, kp], { commitment: "confirmed" })
        console.log(`Closed and gathered SOL from wallets ${i} : https://solscan.io/tx/${sig}`)
      }

      // filter the keypair that is completed (after this procedure, only keypairs with sol or ata will be saved in data.json)
      const bal = await solanaConnection.getBalance(kp.publicKey)
      if (bal == 0) {
        const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(kp.publicKey, {
          programId: TOKEN_PROGRAM_ID,
        },
          "confirmed"
        )
        if (tokenAccounts.value.length == 0) {
          const walletsData = readJson()
          const wallets = walletsData.filter((privateKey) => base58.encode(kp.secretKey) != privateKey)
          saveNewFile(wallets)
          console.log("Wallet closed completely")
        }
      }
    } catch (error) {
      // console.log("transaction error : ", error)
    }
  })
  mainMenuWaiting()
}