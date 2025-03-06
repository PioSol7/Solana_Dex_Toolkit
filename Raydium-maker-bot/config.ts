import { Connection, Keypair } from "@solana/web3.js";
import { retrieveEnvVariable } from "./src/utils";
import base58 from "bs58";
import dotenv from "dotenv"

dotenv.config()

const mainKpStr = retrieveEnvVariable('MAIN_KP');
const rpcUrl = retrieveEnvVariable("RPC_URL");

export const wallet = Keypair.fromSecretKey(base58.decode(mainKpStr));
export const connection = new Connection(rpcUrl, { commitment: "processed" });