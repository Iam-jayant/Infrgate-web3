require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            viaIR: true,
        },
    },
    networks: {
        botchain: {
            url: process.env.BOTCHAIN_RPC_URL || "https://rpc.botchain.ai",
            chainId: 677,
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : [],
        },
        botchain_testnet: {
            url: "https://rpc.bohr.life",
            chainId: 968,
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : [],
        },
    },
    etherscan: {
        apiKey: {
            botchain: process.env.EXPLORER_API_KEY || "no-api-key",
        },
        customChains: [
            {
                network: "botchain",
                chainId: 677,
                urls: {
                    apiURL: "https://scan.botchain.ai/api",
                    browserURL: "https://scan.botchain.ai",
                },
            },
        ],
    },
};
