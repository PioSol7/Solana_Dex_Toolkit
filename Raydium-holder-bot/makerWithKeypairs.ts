import {
  PublicKey, Keypair, Connection, Transaction, ComputeBudgetProgram,
  sendAndConfirmTransaction, VersionedTransaction, TransactionMessage,
  TransactionInstruction, SystemProgram,
} from "@solana/web3.js";
import {
  NATIVE_MINT, TOKEN_PROGRAM_ID, createTransferCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction, getAssociatedTokenAddress, getMint, getMinimumBalanceForRentExemptAccount,
  createSyncNativeInstruction
} from "@solana/spl-token";
import base58 from "bs58";
import { readJson, retrieveEnvVariable, saveDataToFile, sleep } from "./src/utils";
import { bundle } from "./src/jito";
import { Liquidity, LiquidityPoolKeysV4, MAINNET_PROGRAM_ID, InstructionType, Percent, CurrencyAmount, Token, SOL, LiquidityPoolInfo } from "@raydium-io/raydium-sdk";
import { derivePoolKeys, wallet } from "./src/poolAll";
import { lookupTableProvider } from "./src/lut";
import { BN } from "bn.js";

// Environment Variables3
const baseMintStr = retrieveEnvVariable('BASE_MINT');
const mainKpStr = retrieveEnvVariable('MAIN_KP');
const rpcUrl = retrieveEnvVariable("RPC_URL");
const isJito: boolean = retrieveEnvVariable("IS_JITO") === "true";
let buyMax = Number(retrieveEnvVariable('SOL_BUY_MAX'));
let buyMin = Number(retrieveEnvVariable('SOL_BUY_MIN'));
let interval = Number(retrieveEnvVariable('INTERVAL'));
const jito_tx_interval = Number(retrieveEnvVariable('JITO_TX_TIME_INTERVAL')) > 10 ?
  Number(retrieveEnvVariable('JITO_TX_TIME_INTERVAL')) : 10
const makerNum = Number(retrieveEnvVariable('MAKER_NUM'));
const poolId = retrieveEnvVariable('POOL_ID');


const updateEnv = () => {
  setInterval(() => {
    if (
      buyMax != Number(retrieveEnvVariable('SOL_BUY_MAX')) ||
      buyMin != Number(retrieveEnvVariable('SOL_BUY_MIN')) ||
      interval != Number(retrieveEnvVariable('INTERVAL'))
    ) {
      console.log("Setting has changed and updated")
      buyMax = Number(retrieveEnvVariable('SOL_BUY_MAX'));
      buyMin = Number(retrieveEnvVariable('SOL_BUY_MIN'));
      interval = Number(retrieveEnvVariable('INTERVAL'));
    }
  }, 3000)
}

// Solana Connection and Keypair
const connection = new Connection(rpcUrl, { commitment: "processed" });
const mainKp = Keypair.fromSecretKey(base58.decode(mainKpStr));
const baseMint = new PublicKey(baseMintStr);

let poolKeys: LiquidityPoolKeysV4 | null = null;
let tokenAccountRent: number | null = null;
let decimal: number | null = null;
let poolInfo: LiquidityPoolInfo | null = null;

let maker = 0
let now = Date.now()
let unconfirmedKps: Keypair[] = []

/**
 * Executes a buy and sell transaction for a given token.
 * @param {PublicKey} token - The token's public key.
 */
const buySellToken = async (token: PublicKey, newWallet: Keypair) => {
  try {
    if (!tokenAccountRent)
      tokenAccountRent = await getMinimumBalanceForRentExemptAccount(connection);
    if (!decimal)
      decimal = (await getMint(connection, token)).decimals;
    if (!poolKeys) {
      poolKeys = await derivePoolKeys(new PublicKey(poolId))
      if (!poolKeys) {
        console.log("Pool keys is not derived")
        return
      }
    }

    const solBuyAmountLamports = Math.floor((Math.random() * (buyMax - buyMin) + buyMin) * 10 ** 9);
    const quoteAta = await getAssociatedTokenAddress(NATIVE_MINT, mainKp.publicKey);
    const baseAta = await getAssociatedTokenAddress(token, mainKp.publicKey);
    const newWalletBaseAta = await getAssociatedTokenAddress(token, newWallet.publicKey);
    const newWalletQuoteAta = await getAssociatedTokenAddress(NATIVE_MINT, newWallet.publicKey);

    const slippage = new Percent(100, 100);
    const inputTokenAmount = new CurrencyAmount(SOL, solBuyAmountLamports);
    const outputToken = new Token(TOKEN_PROGRAM_ID, baseMint, decimal);

    if (!poolInfo)
      poolInfo = await Liquidity.fetchInfo({ connection, poolKeys })

    const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      amountIn: inputTokenAmount,
      currencyOut: outputToken,
      slippage,
    });
    console.log("🚀 ~ buySellToken ~ amountOut:", amountOut.raw.toString())

    const { amountIn, maxAmountIn } = Liquidity.computeAmountIn({
      poolKeys,
      poolInfo,
      amountOut,
      currencyIn: SOL,
      slippage
    })
    console.log("🚀 ~ buySellToken ~ maxAmountIn:", maxAmountIn.raw.toString())

    const { innerTransaction: innerBuyIxs } = Liquidity.makeSwapFixedOutInstruction(
      {
        poolKeys: poolKeys,
        userKeys: {
          tokenAccountIn: quoteAta,
          tokenAccountOut: baseAta,
          owner: mainKp.publicKey,
        },
        maxAmountIn: maxAmountIn.raw,
        amountOut: amountOut.raw,
      },
      poolKeys.version,
    )

    const { innerTransaction: innerSellIxs } = Liquidity.makeSwapFixedInInstruction(
      {
        poolKeys: poolKeys,
        userKeys: {
          tokenAccountIn: baseAta,
          tokenAccountOut: quoteAta,
          owner: mainKp.publicKey,
        },
        amountIn: amountOut.raw.sub(new BN(10 ** decimal)),
        minAmountOut: 0,
      },
      poolKeys.version,
    );

    const instructions: TransactionInstruction[] = [];
    const latestBlockhash = await connection.getLatestBlockhash();
    instructions.push(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 744_452 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 183_504 }),
      createAssociatedTokenAccountIdempotentInstruction(
        mainKp.publicKey,
        quoteAta,
        mainKp.publicKey,
        NATIVE_MINT,
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        mainKp.publicKey,
        newWalletQuoteAta,
        newWallet.publicKey,
        NATIVE_MINT
      ),
      SystemProgram.transfer({
        fromPubkey: mainKp.publicKey,
        toPubkey: newWalletQuoteAta,
        lamports: solBuyAmountLamports,
      }),
      createSyncNativeInstruction(quoteAta, TOKEN_PROGRAM_ID),
      createAssociatedTokenAccountIdempotentInstruction(
        mainKp.publicKey,
        newWalletBaseAta,
        newWallet.publicKey,
        baseMint,
      ),
      ...innerBuyIxs.instructions,
      createTransferCheckedInstruction(
        baseAta,
        baseMint,
        newWalletBaseAta,
        mainKp.publicKey,
        10 ** decimal,
        decimal
      ),
      ...innerSellIxs.instructions,
      SystemProgram.transfer({
        fromPubkey: newWallet.publicKey,
        toPubkey: mainKp.publicKey,
        lamports: 915_694,
      }),
    )

    const messageV0 = new TransactionMessage({
      payerKey: newWallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message()

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([mainKp, newWallet])

    if (isJito)
      return transaction

    // console.log(await connection.simulateTransaction(transaction))
    const sig = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true })
    const confirmation = await connection.confirmTransaction(
      {
        signature: sig,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        blockhash: latestBlockhash.blockhash,
      },
      "confirmed"
    )
    if (confirmation.value.err) {
      console.log("Confrimtaion error")
      return newWallet
    } else {
      maker++
      console.log(`Buy and sell transaction: https://solscan.io/tx/${sig} and maker is ${maker}`);
    }
  } catch (error) {
    console.log("🚀 ~ buySellToken ~ error:", error)
  }
};

/**
 * Wraps the given amount of SOL into WSOL.
 * @param {Keypair} mainKp - The central keypair which holds SOL.
 * @param {number} wsolAmount - The amount of SOL to wrap.
 */
const wrapSol = async (mainKp: Keypair, wsolAmount: number) => {
  try {
    const wSolAccount = await getAssociatedTokenAddress(NATIVE_MINT, mainKp.publicKey);
    const baseAta = await getAssociatedTokenAddress(baseMint, mainKp.publicKey);
    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 461197 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 51337 }),
    );
    if (!await connection.getAccountInfo(wSolAccount))
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          mainKp.publicKey,
          wSolAccount,
          mainKp.publicKey,
          NATIVE_MINT,
        ),
        SystemProgram.transfer({
          fromPubkey: mainKp.publicKey,
          toPubkey: wSolAccount,
          lamports: Math.floor(wsolAmount * 10 ** 9),
        }),
        createSyncNativeInstruction(wSolAccount, TOKEN_PROGRAM_ID),
      )
    if (!await connection.getAccountInfo(baseAta))
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          mainKp.publicKey,
          baseAta,
          mainKp.publicKey,
          baseMint,
        ),
      )

    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    tx.feePayer = mainKp.publicKey
    const sig = await sendAndConfirmTransaction(connection, tx, [mainKp], { skipPreflight: true, commitment: "confirmed" });
    console.log(`Wrapped SOL transaction: https://solscan.io/tx/${sig}`);
    await sleep(5000);
  } catch (error) {
    console.error("wrapSol error:", error);
  }
};

/**
 * Unwraps WSOL into SOL.
 * @param {Keypair} mainKp - The main keypair.
 */
const unwrapSol = async (mainKp: Keypair) => {
  const wSolAccount = await getAssociatedTokenAddress(NATIVE_MINT, mainKp.publicKey);
  try {
    const wsolAccountInfo = await connection.getAccountInfo(wSolAccount);
    if (wsolAccountInfo) {
      const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 261197 }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: 101337 }),
        createCloseAccountInstruction(
          wSolAccount,
          mainKp.publicKey,
          mainKp.publicKey,
        ),
      );
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      tx.feePayer = mainKp.publicKey
      const sig = await sendAndConfirmTransaction(connection, tx, [mainKp], { skipPreflight: true, commitment: "confirmed" });
      console.log(`Unwrapped SOL transaction: https://solscan.io/tx/${sig}`);
      await sleep(5000);
    }
  } catch (error) {
    console.error("unwrapSol error:", error);
  }
};

/**
 * Main function to run the maker bot.
 */
const run = async () => {

  console.log("main keypair, ", mainKp.publicKey.toBase58())
  console.log("main keypair balance : ", await connection.getBalance(mainKp.publicKey))
  updateEnv()
  const quoteAta = await getAssociatedTokenAddress(NATIVE_MINT, mainKp.publicKey);
  const baseAta = await getAssociatedTokenAddress(baseMint, mainKp.publicKey);

  if (!await connection.getAccountInfo(quoteAta) || !await connection.getAccountInfo(baseAta)) {
    await wrapSol(mainKp, 0.001);
  }


  if (isJito) {
    // setInterval(async () => {
    //   try {
    //     const txs: VersionedTransaction[] = [];
    //     for (let i = 0; i < 4; i++) {
    //       let newWallet: Keypair | null = null;
    //       const tx = await buySellToken(baseMint, newWallet);
    //       if (tx instanceof VersionedTransaction) {
    //         txs.push(tx);
    //       }
    //     }
    //     if (txs.length > 0) {
    //       const sig = base58.encode(txs[0].signatures[0]);
    //       bundle(txs, mainKp)
    //       try {
    //         const confirmedResult = await connection.confirmTransaction(sig, "confirmed");
    //         if (confirmedResult.value.err) {
    //           console.error("Confirmation error");
    //         } else {
    //           console.log(`Buy and sell transaction: https://solscan.io/tx/${sig}`);
    //         }
    //       } catch (error) {
    //         console.error("BuySellToken error in jito mode:", error);
    //       }
    //     }
    //   } catch (error) {
    //     console.error("Error in Jito interval:", error);
    //   }
    // }, jito_tx_interval * 1000);
  } else {
    const wallets = readJson()
    const kps = wallets.map(wallet => Keypair.fromSecretKey(base58.decode(wallet)))
    const walletsNum = wallets.length
    if(wallets.length === 0){
      console.log("No wallet exist in data.json file")
      return
    }

    const kpsGroups: Keypair[][] = []
    const multiNum = Math.ceil(walletsNum / 20)
    for(let i = 0; i < multiNum; i++){
      const lowerIndex = i * 20
      const upperIndex = lowerIndex + 20
      const kpsUnit = []
      for(let j = lowerIndex; j < upperIndex; j++){
        if(kps[j]) 
          kpsUnit.push(kps[j])
      }
      kpsGroups.push(kpsUnit)
    }

    // const waitingLines = []
    // for (let i = 0; i < multiNum; i++)
    //   waitingLines.push(i)


    kpsGroups.map(async (kpsUnit, k) => {
      await sleep(k * 1000)
      const transaction = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: 20_000 }),
      )
      const ixs: TransactionInstruction[] = []

      try {
        for (let i = 0; i < kpsUnit.length; i++) {
          const kp = kpsUnit[i]
          const balance = await connection.getBalance(kp.publicKey)
          if(balance < 1062304)
          ixs.push(
            SystemProgram.transfer({
              fromPubkey: mainKp.publicKey,
              toPubkey: kp.publicKey,
              lamports: 1_062_304 - balance     //  0.000910000
            })
          )
        }
        if(ixs.length > 0) {
          transaction.add(...ixs)
          const sig = await sendAndConfirmTransaction(connection, transaction, [mainKp], { commitment: "confirmed", skipPreflight: true })
          console.log(`Sent SOL for fee payer wallet for first run: https://solscan.io/tx/${sig}`)
        }
        kpsUnit.forEach(async (kp, i) => {
          // let newWallet: Keypair | null = kp;
          await sleep(50 * i)
          if (i == 0) {
            const balance = await connection.getBalance(mainKp.publicKey);
            console.log("Main wallet balance: ", balance / 10 ** 9, "SOL");
          }
          const returnedKp = await buySellToken(baseMint, kp);
          if (returnedKp instanceof Keypair) {
            unconfirmedKps.push(returnedKp)
          }
        });
      } catch (error) {
        console.error("Error:", error);
      }
    })
  }
};

// Main function that runs the bot
run();
// updateEnv()

// You can run the wrapSOL function to wrap some sol in central wallet for any reasone
// wrapSol(mainKp, 0.2)

// unWrapSOl function to unwrap all WSOL in central wallet that is in the wallet
// unwrapSol(mainKp)

