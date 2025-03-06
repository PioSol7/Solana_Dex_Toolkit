import {
    Keypair, Connection, Transaction, ComputeBudgetProgram, sendAndConfirmTransaction
} from "@solana/web3.js";
import {
    NATIVE_MINT,
    createCloseAccountInstruction, getAssociatedTokenAddress
} from "@solana/spl-token";
import base58 from "bs58";
import { retrieveEnvVariable, saveDataToFile, sleep } from "./src/utils";

// Environment Variables3
const mainKpStr = retrieveEnvVariable('MAIN_KP');
const rpcUrl = retrieveEnvVariable("RPC_URL");

// Solana Connection and Keypair
const connection = new Connection(rpcUrl, { commitment: "processed" });
const mainKp = Keypair.fromSecretKey(base58.decode(mainKpStr));

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

unwrapSol(mainKp)