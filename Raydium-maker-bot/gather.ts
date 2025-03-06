import base58 from "bs58"
import { readJson, readSettings, retrieveEnvVariable, sleep } from "./src/utils"
import { ComputeBudgetProgram, Connection, Keypair, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { SPL_ACCOUNT_LAYOUT, TokenAccount } from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";

const rpcUrl = retrieveEnvVariable("RPC_URL");
const mainKpStr = retrieveEnvVariable('MAIN_KP');
const connection = new Connection(rpcUrl, { commitment: "processed" });
const mainKp = Keypair.fromSecretKey(base58.decode(mainKpStr))

export const gather = async () => {
  const walletsStr = readJson()
  const wallets = walletsStr.map(walletStr => Keypair.fromSecretKey(base58.decode(walletStr)))
  wallets.map(async (kp, i) => {
    try {
      await sleep(i * 100)
      const accountInfo = await connection.getAccountInfo(kp.publicKey)

      const tokenAccounts = await connection.getTokenAccountsByOwner(kp.publicKey, {
        programId: TOKEN_PROGRAM_ID,
      },
        "confirmed"
      )

      const ixs: TransactionInstruction[] = []
      const accounts: TokenAccount[] = [];
      if (accountInfo) {
        const solBal = await connection.getBalance(kp.publicKey)
        ixs.push(
          SystemProgram.transfer({
            fromPubkey: kp.publicKey,
            toPubkey: mainKp.publicKey,
            lamports: solBal
          })
        )
      }
      if (tokenAccounts.value.length > 0)
        for (const { pubkey, account } of tokenAccounts.value) {
          accounts.push({
            pubkey,
            programId: account.owner,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
          });
        }

      for (let j = 0; j < accounts.length; j++) {
        const baseAta = await getAssociatedTokenAddress(accounts[j].accountInfo.mint, mainKp.publicKey)
        const tokenAccount = accounts[j].pubkey
        const tokenBalance = (await connection.getTokenAccountBalance(accounts[j].pubkey)).value
        ixs.push(createAssociatedTokenAccountIdempotentInstruction(mainKp.publicKey, baseAta, mainKp.publicKey, accounts[j].accountInfo.mint))
        ixs.push(createTransferCheckedInstruction(tokenAccount, accounts[j].accountInfo.mint, baseAta, kp.publicKey, BigInt(tokenBalance.amount), tokenBalance.decimals))
        ixs.push(createCloseAccountInstruction(tokenAccount, mainKp.publicKey, kp.publicKey))
      }

      // console.log('----------------------')
      if (ixs.length) {
        const tx = new Transaction().add(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 220_000 }),
          ComputeBudgetProgram.setComputeUnitLimit({ units: 350_000 }),
          ...ixs,
        )
        tx.feePayer = mainKp.publicKey
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        // console.log(await connection.simulateTransaction(tx))
        const sig = await sendAndConfirmTransaction(connection, tx, [mainKp, kp], { commitment: "confirmed" })
        console.log(`Closed and gathered SOL from wallets ${i} : https://solscan.io/tx/${sig}`)
        return
      }
    } catch (error) {
      console.log("transaction error : ", error)
      return
    }
  })

}

gather()