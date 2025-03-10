# Solana Raydium, Pumpfun Dex Boosting Botkit

This bot is designed to boost the ranking of your token in Raydium and pumpfun dex platforms.

## Features

- **Volume Boosting**: Boosting volume effectively in a short time.
- **Holder Boosting**: Boosting number of holders effectively in a short time.
- **Maker Boosting**: Boosting number of makers effectively in a short time.
- **Anti-Mev Transactions**: Making transactions.
- **Saving Solana By Closing All Atas**: Gradually sells all tokens in sub-wallets through small transactions or Sell at once from all sub-wallets.
- **Configurable CA and PoolId of your token**: Configurable token mint .
- **Logging**: Supports adjustable logging levels for better monitoring and debugging.

## Environment Variables

The bot uses the following environment variables, which should be defined in a `.env` file:

```env
MAIN_KP=
RPC_URL=https://mainnet.helius-rpc.com/?api-key=
SLIPPAGE=5
COMPUTE_UNIT_PRICE=744452

# jito
BLOCKENGINE_URL=tokyo.mainnet.block-engine.jito.wtf
JITO_FEE=0.005

{
  "mint": "3ywvZjK5NMgC4urXmPuzfxsioC5pH492Go5yirLDyiji",
  "poolId": "7mGYoadwkX2QPj7MqgeNi8AzGnh2DAkxNh9mS6CcQfaV",
  "buyMax": 0.0002,
  "buyMin": 0.0001,
  "walletNum": 50,
  "timeInterval": 5000
}
```

## Usage
1. Clone the repository
```
git clone https://github.com/PioSol7/Solana_Dex_Toolkit.git
cd Solana_Dex_Toolkit
```
2. Install dependencies
```
npm install
```
3. Configure the environment variables

Rename the .env.example file to .env and set RPC and WSS, main keypair's secret key and all settings in settings.ts file.


## Author

Discord: Takhi77 in discord

Telegram: [@Takhi777](https://t.me/@Takhi777)

You can always feel free to find me here for my help on other projects.
