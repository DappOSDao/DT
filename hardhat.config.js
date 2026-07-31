/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");

const {
  ETH_RPC_URL,
  BSC_RPC_URL,
  DEPLOYER_PRIVATE_KEY,
  BASESCAN_API_KEY,
} = process.env;

module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: ETH_RPC_URL,
      },
      accounts: DEPLOYER_PRIVATE_KEY ? [{ privateKey: DEPLOYER_PRIVATE_KEY, balance: "1000000000000000000000000" }] : [],
      chainId: 1,
    },
    eth: {
      url: ETH_RPC_URL,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    bsc: {
      url: BSC_RPC_URL,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },

  etherscan: {
    apiKey: BASESCAN_API_KEY,
  },
};
