const { ethers } = require("hardhat");

const ETH_CHAIN_ID = 1;

function resolveAddress(envName) {
  const value = process.env[envName];

  if (!value) {
    throw new Error(`Missing env ${envName}.`);
  }

  if (!ethers.utils.isAddress(value)) {
    throw new Error(`Invalid env ${envName}: ${value}`);
  }

  return value;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await deployer.provider?.getNetwork();
  if (network.chainId !== ETH_CHAIN_ID) {
    throw new Error(`Wrong network. DapposTokenAdapter must be deployed on ETH chainId=${ETH_CHAIN_ID}, current chainId=${network.chainId}.`);
  }

  const tokenAddress = resolveAddress("ETH_TOKEN_ADDRESS");
  const layerZeroEndpoint = resolveAddress("ETH_LAYERZERO_ENDPOINT");
  const ownerAddress = resolveAddress("ETH_OWNER_ADDRESS");

  console.log(`Using deployer: ${deployer.address}`);
  console.log(
    `Network: chainId=${network?.chainId?.toString() ?? "unknown"} (${network?.name ?? "unknown"})`
  );
  console.log(
    `Deploying DapposTokenAdapter with token=${tokenAddress}, endpoint=${layerZeroEndpoint}, owner=${ownerAddress} ...`
  );

  const DapposTokenAdapter = await ethers.getContractFactory("DapposTokenAdapter", deployer);
  const adapter = await DapposTokenAdapter.deploy(tokenAddress, layerZeroEndpoint, ownerAddress);
  console.log("Deployment tx:", adapter.deployTransaction.hash);

  await adapter.deployed();
  console.log(`DapposTokenAdapter deployed at: ${adapter.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
