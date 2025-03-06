import base58 from "bs58"
import { readJson, retrieveEnvVariable, sleep } from "./src/utils"
import { ComputeBudgetProgram, Connection, Keypair, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js"
import { NATIVE_MINT, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { Liquidity, LiquidityPoolKeysV4, SPL_ACCOUNT_LAYOUT, TokenAccount } from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
import { derivePoolKeys } from "./src/poolAll";

const rpcUrl = retrieveEnvVariable("RPC_URL");
const mainKpStr = retrieveEnvVariable('MAIN_KP');
const connection = new Connection(rpcUrl, { commitment: "processed" });
const mainKp = Keypair.fromSecretKey(base58.decode(mainKpStr))
const baseMintStr = retrieveEnvVariable('BASE_MINT');
const baseMint = new PublicKey(baseMintStr)
const poolId = retrieveEnvVariable('POOL_ID');

const main = async () => {

    const baseAta = await getAssociatedTokenAddress(baseMint, mainKp.publicKey)
    const quoteAta = await getAssociatedTokenAddress(NATIVE_MINT, mainKp.publicKey)
    const tokenBal = (await connection.getTokenAccountBalance(baseAta)).value.amount
  
    let poolKeys: LiquidityPoolKeysV4 | null = null;
    poolKeys = await derivePoolKeys(new PublicKey(poolId))
  
    if (poolKeys) {
  
      const { innerTransaction: innerSellIxs } = Liquidity.makeSwapFixedInInstruction(
        {
          poolKeys: poolKeys,
          userKeys: {
            tokenAccountIn: baseAta,
            tokenAccountOut: quoteAta,
            owner: mainKp.publicKey,
          },
          amountIn: tokenBal,
          minAmountOut: 0,
        },
        poolKeys.version,
      );
  
      const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 220_000 }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: 350_000 }),
        ...innerSellIxs.instructions
      )
      tx.feePayer = mainKp.publicKey
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      // console.log(await connection.simulateTransaction(tx))
      const sig = await sendAndConfirmTransaction(connection, tx, [mainKp], { commitment: "confirmed" })
      console.log(`Swap token transaction : https://solscan.io/tx/${sig}`)
    }
}

main()