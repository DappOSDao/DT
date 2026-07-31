const { ethers } = require("hardhat");

const BSC_CHAIN_ID = 56;

function resolveEnv(envName) {
  const value = process.env[envName];

  if (!value) {
    throw new Error(`Missing env ${envName}.`);
  }

  return value;
}

function resolveAddress(envName) {
  const value = resolveEnv(envName);

  if (!ethers.utils.isAddress(value)) {
    throw new Error(`Invalid env ${envName}: ${value}`);
  }

  return value;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await deployer.provider?.getNetwork();
  if (network.chainId !== BSC_CHAIN_ID) {
    throw new Error(`Wrong network. DapposTokenOFT must be deployed on BSC chainId=${BSC_CHAIN_ID}, current chainId=${network.chainId}.`);
  }

  const name = resolveEnv("BSC_TOKEN_NAME");
  const symbol = resolveEnv("BSC_TOKEN_SYMBOL");
  const layerZeroEndpoint = resolveAddress("BSC_LAYERZERO_ENDPOINT");
  const ownerAddress = resolveAddress("BSC_OWNER_ADDRESS");

  console.log(`Using deployer: ${deployer.address}`);
  console.log(
    `Network: chainId=${network?.chainId?.toString() ?? "unknown"} (${network?.name ?? "unknown"})`
  );
  console.log(
    `Deploying DapposTokenOFT with name=${name}, symbol=${symbol}, endpoint=${layerZeroEndpoint}, owner=${ownerAddress} ...`
  );

  const DapposTokenOFT = await ethers.getContractFactory("DapposTokenOFT", deployer);
  const oft = await DapposTokenOFT.deploy(name, symbol, layerZeroEndpoint, ownerAddress);
  console.log("Deployment tx:", oft.deployTransaction.hash);

  await oft.deployed();
  console.log(`DapposTokenOFT deployed at: ${oft.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
