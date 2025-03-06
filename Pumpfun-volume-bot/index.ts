import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { solanaConnection, startVolumeBot } from "./bot";
import { main_menu_display, rl, screen_clear, settings_display } from "./menu/menu";
import { readSettings, saveSettingsToFile, sleep } from "./utils/utils";
import { PRIVATE_KEY } from "./constants";
import base58 from "bs58";

const init = () => {
    screen_clear();
    console.log("Raydium Volume Bot");

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
                startVolumeBot()
                break;
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

const settings = () => {
    screen_clear();
    console.log("Settings")
    settings_display();

    rl.question("\t[Settings] - Choice: ", (answer: string) => {
        let choice = parseInt(answer);
        switch (choice) {
            case 1:
                set_wallet_num();
                break;
            case 2:
                set_sol_amount();
                break;
            case 3:
                set_slippage();
                break;
            case 4:
                set_mint();
                break;
            case 5:
                set_buy_max();
                break;
            case 6:
                set_buy_min();
                break;
            case 7:
                set_dist_time_max();
                break;
            case 8:
                set_dist_time_min();
                break;
            case 9:
                set_buy_time_max();
                break;
            case 10:
                set_buy_time_min();
                break;
            case 11:
                set_sell_time_max();
                break;
            case 12:
                set_sell_time_min();
                break;
            case 13:
                init();
                break;
            case 14:
                process.exit(1);
            default:
                console.log("\tInvalid choice!");
                sleep(1500);
                settings_display();
                break;
        }
    })
}

const set_wallet_num = () => {
    screen_clear();
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }
    console.log(`Please Enter the Number of wallets you want, current value is ${settings.walletNum}`)
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

const set_sol_amount = () => {
    screen_clear();
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }
    console.log(`Please Enter the buying amount of Solana you want, current value is ${settings.solAmount}`)
    rl.question("\t[Buying Amount of Solana] - Number: ", (answer: string) => {
        if (answer == 'c') {
            settingsWaiting()
            return
        }
        let choice = parseFloat(answer);
        settings.solAmount = choice
        saveSettingsToFile(settings)
        console.log(`The buying amount of solana ${answer} is set correctly!`)
        settingsWaiting()
    })
}

const set_slippage = () => {
    screen_clear();
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }
    console.log(`Please Enter the Slippage you want, current value is ${settings.slippage}`)
    rl.question("\t[Slippage] - Number(%): ", (answer: string) => {
        if (answer == 'c') {
            settingsWaiting()
            return
        }
        let choice = parseInt(answer);
        settings.slippage = choice
        saveSettingsToFile(settings)
        console.log(`Slippage ${answer} is set correctly!`)
        settingsWaiting()
    })
}

const set_mint = () => {
    screen_clear();
    console.log("Please Enter the Contract Address of the token you want")
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
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

const set_buy_max = () => {
    screen_clear();
    console.log("Please Enter maximum percentage of Buy you want(recommended to be lower than 50%)")
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }

    rl.question("\t[Buy amount in each wallet] - Percentage: ", (answer: string) => {
        if (answer == 'c') {
            settingsWaiting()
            return
        }
        let choice = parseInt(answer);
        settings.buyMax = choice
        saveSettingsToFile(settings)
        console.log(`Wallet number ${answer} is set correctly!`)
        settingsWaiting()
    })
}

const set_buy_min = () => {
    screen_clear();
    console.log("Please Enter minimum percentage of Buy you want(recommended to be lower than 50%)")
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }

    rl.question("\t[Buy amount in each wallet] - Percentage: ", (answer: string) => {
        if (answer == 'c') {
            settingsWaiting()
            return
        }
        let choice = parseInt(answer);
        settings.buyMin = choice
        saveSettingsToFile(settings)
        console.log(`Wallet number ${answer} is set correctly!`)
        settingsWaiting()
    })
}

const set_dist_time_max = () => {
    screen_clear();
    console.log("Please Enter maximum interval of Distribution you want")
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }

    rl.question("\t[Maximum Time interval of distribution] - Number(seconds): ", (answer: string) => {
        if (answer == 'c') {
            settingsWaiting()
            return
        }
        let choice = parseInt(answer);
        settings.distIntervalMax = choice
        saveSettingsToFile(settings)
        console.log(`Maximum time interval of distribution ${answer}s is set correctly!`)
        settingsWaiting()
    })
}

const set_dist_time_min = () => {
    screen_clear();
    console.log("Please Enter minimum interval of Distribution you want")
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }

    rl.question("\t[Minimum Time interval of distribution] - Number(seconds): ", (answer: string) => {
        if (answer == 'c') {
            settingsWaiting()
            return
        }
        let choice = parseInt(answer);
        settings.distIntervalMax = choice
        saveSettingsToFile(settings)
        console.log(`Minimum time interval of distribution ${answer}s is set correctly!`)
        settingsWaiting()
    })
}

const set_buy_time_max = () => {
    screen_clear();
    console.log("Please Enter maximum interval of Buy you want")
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }

    rl.question("\t[Maximum Time interval of buy] - Number(seconds): ", (answer: string) => {
        if (answer == 'c') {
            settingsWaiting()
            return
        }
        let choice = parseInt(answer);
        settings.buyIntervalMax = choice
        saveSettingsToFile(settings)
        console.log(`Maximum time interval of buy ${answer}s is set correctly!`)
        settingsWaiting()
    })
}

const set_buy_time_min = () => {
    screen_clear();
    console.log("Please Enter minimum interval of Buy you want")
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }

    rl.question("\t[Minimum Time interval of buy] - Number(seconds): ", (answer: string) => {
        if (answer == 'c') {
            settingsWaiting()
            return
        }
        let choice = parseInt(answer);
        settings.buyIntervalMin = choice
        saveSettingsToFile(settings)
        console.log(`Minimum time interval of buy ${answer}s is set correctly!`)
        settingsWaiting()
    })
}

const set_sell_time_max = () => {
    screen_clear();
    console.log("Please Enter maximum interval of Sell you want")
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }

    rl.question("\t[Maximum Time interval of sell] - Number(seconds): ", (answer: string) => {
        if (answer == 'c') {
            settingsWaiting()
            return
        }
        let choice = parseInt(answer);
        settings.distIntervalMax = choice
        saveSettingsToFile(settings)
        console.log(`Maximum time interval of sell ${answer}s is set correctly!`)
        settingsWaiting()
    })
}

const set_sell_time_min = () => {
    screen_clear();
    console.log("Please Enter minimum interval of Sell you want")
    let data = readSettings()
    let settings = {
        walletNum: Number(data.walletNum),
        solAmount: Number(data.solAmount),
        slippage: Number(data.slippage),
        mint: new PublicKey(data.mint!),
        buyMax: Number(data.buyMax),
        buyMin: Number(data.buyMin),
        distIntervalMax: Number(data.distIntervalMax),
        distIntervalMin: Number(data.distIntervalMin),
        buyIntervalMax: Number(data.buyIntervalMax),
        buyIntervalMin: Number(data.buyIntervalMin),
        sellIntervalMax: Number(data.sellIntervalMax),
        sellIntervalMin: Number(data.sellIntervalMin)
    }

    rl.question("\t[Minimum Time interval of sell] - Number(seconds): ", (answer: string) => {
        if (answer == 'c') {
            settingsWaiting()
            return
        }
        let choice = parseInt(answer);
        settings.sellIntervalMin = choice
        saveSettingsToFile(settings)
        console.log(`Minimum time interval of sell ${answer}s is set correctly!`)
        settingsWaiting()
    })
}

const show_settings = () => {
    let data = readSettings()
    console.log("Current settings of Volume bot...")
    console.log(data)
    mainMenuWaiting()
}

const show_balance = async () => {
    const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY));
    const balance = await solanaConnection.getBalance(mainKp.publicKey)
    console.log(`Balance of ${mainKp.publicKey.toBase58()} is ${balance / LAMPORTS_PER_SOL}Sol.`)
    mainMenuWaiting()
}

const mainMenuWaiting = () => {
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