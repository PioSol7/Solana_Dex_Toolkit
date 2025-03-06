import {
  PublicKey, Keypair, ComputeBudgetProgram,
  VersionedTransaction, TransactionMessage,
  TransactionInstruction, SystemProgram,
  Commitment,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import base58 from "bs58";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { readSettings, saveDataToFile, saveNewFile, sleep } from "./src/utils";
import { COMPUTE_UNIT_PRICE, connection, mainWallet, slippageBasisPoints } from "./config";
import { BONDING_CURVE_SEED, GLOBAL_ACCOUNT_SEED, PumpFunSDK } from "./src/pumpfun/pumpfun";
import { global_mint } from "./constants";
import { calculateWithSlippageBuy, DEFAULT_COMMITMENT, readJson } from "./src/util";
import { IDL, PumpFun } from "./src/pumpfun/idl";
import { BondingCurveAccount } from "./src/pumpfun/bondingCurveAccount";
import { GlobalAccount } from "./src/pumpfun/globalAccount";
import { rl } from "./menu/menu";
import { init } from ".";

const settings = readSettings()
const buyMax = Number(settings.buyMax)
const buyMin = Number(settings.buyMin)
const interval = Number(settings.timeInterval)
const holderNum = Number(settings.walletNum)
const baseMintStr = settings.mint

// Solana Connection and Keypair
const baseMint = new PublicKey(baseMintStr!);

let maker = 0
let now = Date.now()
let unconfirmedKps: Keypair[] = []
let bondingCurveAccount: BondingCurveAccount | null
let program: Program<PumpFun> = new Program<PumpFun>(IDL as PumpFun, new AnchorProvider(connection, new NodeWallet(new Keypair()), { commitment: "confirmed" }));
const PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
let mainAta: PublicKey = getAssociatedTokenAddressSync(baseMint, mainWallet.publicKey)

/**
 * Executes a buy and sell transaction for a given token.
 * @param {PublicKey} token - The token's public key.
 */
const buySellToken = async (token: PublicKey, newWallet: Keypair) => {
  
  // Missing parts (Contact: https://t.me/@Takhi777)

};

const getBondingCurveAccount = async (
  mint: PublicKey,
  commitment: Commitment = DEFAULT_COMMITMENT
) => {
  const tokenAccount = await connection.getAccountInfo(
    getBondingCurvePDA(mint),
    commitment
  );
  if (!tokenAccount) {
    return null;
  }
  return BondingCurveAccount.fromBuffer(tokenAccount!.data);
}

const getBondingCurvePDA = (mint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
    program.programId
  )[0];
}

const getGlobalAccount = async (commitment: Commitment = DEFAULT_COMMITMENT) => {
  const [globalAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_ACCOUNT_SEED)],
    new PublicKey(PROGRAM_ID)
  );

  const tokenAccount = await connection.getAccountInfo(
    globalAccountPDA,
    commitment
  );

  return GlobalAccount.fromBuffer(tokenAccount!.data);
}

/**
 * Main function to run the Maker bot.
 */
export const startMakerBot = async () => {

  console.log("Main Wallet, ", mainWallet.publicKey.toBase58())
  const balance = await connection.getBalance(mainWallet.publicKey)
  console.log("Main Wallet balance : ", balance)

  let data = readSettings()
  console.log(`Maker bot is running`)
  console.log(`Wallet address: ${mainWallet.publicKey.toBase58()}`)
  console.log(`Wallet SOL balance: ${(balance / LAMPORTS_PER_SOL).toFixed(3)}SOL`)
  console.log(`Buying wait time: ${data.timeInterval}s`)
  console.log(`Buy upper limit amount: ${data.buyMax}sol`)
  console.log(`Buy lower limit amount: ${data.buyMin}sol`)

  if (balance < (3500000 + buyMax) * holderNum) {
    console.log(`The balance of the main wallet is not enough, it should be more than ${(3500000 + buyMax) * holderNum / LAMPORTS_PER_SOL}Sol, but it has ${balance / LAMPORTS_PER_SOL}`)
  }

  const accountInfo = await connection.getAccountInfo(mainAta)
  if (!accountInfo) {
    const transaction = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COMPUTE_UNIT_PRICE }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 23_504 }),
      createAssociatedTokenAccountIdempotentInstruction(mainWallet.publicKey, mainAta, mainWallet.publicKey, baseMint)
    )
    const sig = await sendAndConfirmTransaction(connection, transaction, [mainWallet])
    console.log(`Ata of main wallet is created : https://solscan.io/tx/${sig}`)
    await sleep(1000)
  }

  bondingCurveAccount = await getBondingCurveAccount(
    global_mint,
    DEFAULT_COMMITMENT
  );

  const multiNum = Math.ceil(holderNum / 20)
  for (let i = 0; i < multiNum; i++) {

    console.log("-------------- New round started --------------")

    const kps: Keypair[] = []
    const transaction = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COMPUTE_UNIT_PRICE }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 20_000 }),
    )

    try {
      for (let j = i * 20; j < ((i + 1) * 20 < holderNum ? (i + 1) * 20 : holderNum); j++) {
        const kp = Keypair.generate();
        kps.push(kp)
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: mainWallet.publicKey,
            toPubkey: kp.publicKey,
            lamports: 3_500_000     //  0.000910000
          })
        )
      }
      saveDataToFile(kps.map(kp => base58.encode(kp.secretKey)))
      const sig = await sendAndConfirmTransaction(connection, transaction, [mainWallet], { commitment: "confirmed", skipPreflight: true })
      console.log(`Sent SOL for fee payer wallets: https://solscan.io/tx/${sig}`)
      let balance = await connection.getBalance(mainWallet.publicKey) / LAMPORTS_PER_SOL
      console.log("Remain balance of the main wallet: ", balance)

      for (let k = 0; k < kps.length; k++) {
        // let newWallet: Keypair | null = kp;
        if (k == 0) {
          const balance = await connection.getBalance(mainWallet.publicKey);
          console.log("Main wallet balance: ", balance / 10 ** 9, "SOL");
        }
        const returnedKp = await buySellToken(baseMint, kps[k]);
        if (returnedKp instanceof Keypair) {
          unconfirmedKps.push(returnedKp)
        }
        await sleep(interval)
      }

      kps.map(async (kp) => {
        // Missing part here
      })

    } catch (error) {
      console.error("Error: ", error);
    }

  }
  mainMenuWaiting()
};

const mainMenuWaiting = () => {
  rl.question('\x1b[32mpress Enter key to continue\x1b[0m', (answer: string) => {
    init()
  })
}