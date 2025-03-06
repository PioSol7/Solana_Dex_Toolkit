import readline from "readline"

export const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

export const screen_clear = () => {
    console.clear();
}

export const main_menu_display = () => {
    console.log('\t[1] - Show Settings');
    console.log('\t[2] - Current Balance of your wallet');
    console.log('\t[3] - Settings');
    console.log('\t[4] - Start the maker bot');
    // console.log('\t[5] - Gather Sol');
    console.log('\t[5] - Exit');
}

export const settings_display = () => {
    console.log('\t[1] - Contract Address of the token');
    console.log('\t[2] - Pool Address of the token pair');
    console.log('\t[3] - Maximum amount of Solana to buy');
    console.log('\t[4] - Minimum amount of Solana to buy');
    console.log('\t[5] - Number of wallets to newly create');
    console.log('\t[6] - Time Interval between each wallets in miliseconds');
    console.log('\t[7] - Back');
    console.log('\t[8] - Exit');
}