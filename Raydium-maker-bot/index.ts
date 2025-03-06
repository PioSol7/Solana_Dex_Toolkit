import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { connection, startMakerBot } from "./bot";
import { main_menu_display, rl, screen_clear, settings_display } from "./menu/menu";
import { readSettings, retrieveEnvVariable, saveSettingsToFile, sleep } from "./src/utils";
import base58 from "bs58";
import { gather } from "./gather";

export const init = () => {
    screen_clear();
    console.log("Raydium Maker Bot");

    main_menu_display();

    rl.question("\t[Main] - Choice: ", (answer: string) => {
        let choice = parseInt(answer);
        switch (choice) {
            case 1:
                show_settings()
                break;
            case 2:
                show_balance()
                break;
            case 3:
                settings()
                break;
            case 4:
                startMakerBot()
                break;
            // case 5:
            //     gather()
            //     break;
            case 5:
                process.exit(1);
            default:
                console.log("\tInvalid choice!");
                sleep(1500);
                init();
                break;
        }
    })
}

export const settings = () => {
    screen_clear();
    console.log("Settings")
    settings_display();

    rl.question("\t[Settings] - Choice: ", (answer: string) => {
        let choice = parseInt(answer);
        switch (choice) {
            case 1:
                set_token_mint();
                break;
            case 2:
                set_pool_id();
                break;
            case 3:
                set_buy_max();
                break;
            case 4:
                set_buy_min();
                break;
            case 5:
                set_maker_num();
                break;
            case 6:
                set_time_interval();
                break;
            case 7:
                init();
                break;
            case 8:
                process.exit(1);
            default:
                console.log("\tInvalid choice!");
                sleep(1500);
                settings_display();
                break;
        }
    })
}

const set_token_mint = () => {
    screen_clear();
    console.log("Please Enter the Contract Address of the token you want (If you want to go back, then press c and press Enter)")
    let data = readSettings()
    let settings = {
        mint: new PublicKey(data.mint!),
        poolId: new PublicKey(data.poolId!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        walletNum: Number(data.walletNum),
        timeInterval: Number(data.timeInterval)
    }

    rl.question("\t[Token Mint] - PublicKey: ", (answer: string) => {

        if (answer == 'c') {
            settingsWaiting()
            return
        }

        let choice = new PublicKey(answer);
        settings.mint = choice
        saveSettingsToFile(settings)
        console.log(`Contract address of the token ${answer} is set correctly!`)
        settingsWaiting()
    })
}

const set_pool_id = () => {
    screen_clear();
    console.log("Please Enter the Pool Address of the token pair you want (If you want to go back, then press c and press Enter)")
    let data = readSettings()
    let settings = {
        mint: new PublicKey(data.mint!),
        poolId: new PublicKey(data.poolId!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        walletNum: Number(data.walletNum),
        timeInterval: Number(data.timeInterval)
    }

    rl.question("\t[Token Mint] - PublicKey: ", (answer: string) => {

        if (answer == 'c') {
            settingsWaiting()
            return
        }

        let choice = new PublicKey(answer);
        settings.poolId = choice
        saveSettingsToFile(settings)
        console.log(`Pair ID of the pool ${answer} is set correctly!`)
        settingsWaiting()
    })
}

const set_buy_max = () => {
    screen_clear();
    console.log("Please Enter maximum amount of Buy you want (If you want to go back, then press c and press Enter)")
    let data = readSettings()
    let settings = {
        mint: new PublicKey(data.mint!),
        poolId: new PublicKey(data.poolId!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        walletNum: Number(data.walletNum),
        timeInterval: Number(data.timeInterval)
    }

    rl.question("\t[Buy amount in each wallet] - Solana: ", (answer: string) => {

        if (answer == 'c') {
            settingsWaiting()
            return
        }

        let choice = parseFloat(answer);
        settings.buyMax = choice
        saveSettingsToFile(settings)
        console.log(`Buy amount ${answer}sol is set correctly!`)
        settingsWaiting()
    })
}

const set_buy_min = () => {
    screen_clear();
    console.log("Please Enter minimum Sol amount of Buy you want (If you want to go back, then press c and press Enter)")
    let data = readSettings()
    let settings = {
        mint: new PublicKey(data.mint!),
        poolId: new PublicKey(data.poolId!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        walletNum: Number(data.walletNum),
        timeInterval: Number(data.timeInterval)
    }

    rl.question("\t[Buy amount in each wallet] - Solana: ", (answer: string) => {

        if (answer == 'c') {
            settingsWaiting()
            return
        }
 
        let choice = parseFloat(answer);
        settings.buyMin = choice
        saveSettingsToFile(settings)
        console.log(`Buy amount ${answer}sol is set correctly!`)
        settingsWaiting()
    })
}

const set_maker_num = () => {
    screen_clear();
    console.log("Please Enter the Number of wallets you want (If you want to go back, then press c and press Enter)")
    let data = readSettings()
    let settings = {
        mint: new PublicKey(data.mint!),
        poolId: new PublicKey(data.poolId!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        walletNum: Number(data.walletNum),
        timeInterval: Number(data.timeInterval)
    }

    rl.question("\t[Number of Wallets] - Number: ", (answer: string) => {

        if (answer == 'c') {
            settingsWaiting()
            return
        }

        let choice = parseInt(answer);
        settings.walletNum = choice
        saveSettingsToFile(settings)
        console.log(`Wallet number ${answer} is set correctly!`)
        settingsWaiting()
    })
}

const set_time_interval = () => {
    screen_clear();
    console.log("Please Enter the Time interval you want (If you want to go back, then press c and press Enter)")
    let data = readSettings()
    let settings = {
        mint: new PublicKey(data.mint!),
        poolId: new PublicKey(data.poolId!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        walletNum: Number(data.walletNum),
        timeInterval: Number(data.timeInterval)
    }

    rl.question("\t[Time interval between makers] - miliseconds: ", (answer: string) => {

        if (answer == 'c') {
            settingsWaiting()
            return
        }

        let choice = parseFloat(answer);
        settings.timeInterval = choice
        saveSettingsToFile(settings)
        console.log(`Time interval ${answer}ms is set correctly!`)
        settingsWaiting()
    })
}

const show_settings = () => {
    let data = readSettings()
    console.log("Current settings of Maker bot...")
    console.log(data)
    mainMenuWaiting()
}

const show_balance = async () => {
    const mainKpStr = retrieveEnvVariable('MAIN_KP');
    const mainKp = Keypair.fromSecretKey(base58.decode(mainKpStr));
    const balance = await connection.getBalance(mainKp.publicKey)
    console.log(`Balance of ${mainKp.publicKey.toBase58()} is ${balance / LAMPORTS_PER_SOL}Sol.`)
    mainMenuWaiting()
}

export const mainMenuWaiting = () => {
    rl.question('\x1b[32mpress Enter key to continue\x1b[0m', (answer: string) => {
        init()
    })
}

const settingsWaiting = () => {
    rl.question('\x1b[32mpress Enter key to continue\x1b[0m', (answer: string) => {
        settings()
    })
}

init()