import { Connection, Keypair } from "@solana/web3.js";
import { retrieveEnvVariable } from "./src/utils";
import base58 from "bs58";
import dotenv from "dotenv"

dotenv.config()

const mainKpStr = retrieveEnvVariable('MAIN_KP');
const rpcUrl = retrieveEnvVariable("RPC_URL");

export const mainWallet = Keypair.fromSecretKey(base58.decode(mainKpStr));
export const solanaConnection = new Connection(rpcUrl, { commitment: "confirmed" });
export const SLIPPAGE = Number(retrieveEnvVariable('SLIPPAGE'))
export const COMPUTE_UNIT_PRICE = Number(retrieveEnvVariable('COMPUTE_UNIT_PRICE'))