const { ethers } = require("hardhat");

const BSC_CHAIN_ID = 56;
const ETH_EID = 30101;
const SEND_MSG_TYPE = 1;
const LZ_RECEIVE_GAS = 100000;

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

function addressToBytes32(address) {
  return ethers.utils.hexZeroPad(address, 32);
}

function buildLzReceiveOption(gas, value) {
  const TYPE_3 = 3;
  const WORKER_ID = 1;
  const OPTION_TYPE_LZRECEIVE = 1;

  const option = ethers.utils.solidityPack(["uint128", "uint128"], [gas, value]);
  const optionSize = 1 + (option.length - 2) / 2;

  return (
    ethers.utils.solidityPack(
      ["uint16", "uint8", "uint16", "uint8"],
      [TYPE_3, WORKER_ID, optionSize, OPTION_TYPE_LZRECEIVE]
    ) + option.slice(2)
  );
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await deployer.provider?.getNetwork();
  if (network.chainId !== BSC_CHAIN_ID) {
    throw new Error(`Wrong network. DapposTokenOFT must be configured on BSC chainId=${BSC_CHAIN_ID}, current chainId=${network.chainId}.`);
  }

  const oftAddress = resolveAddress("BSC_OFT_ADDRESS");
  const ethAdapterAddress = resolveAddress("ETH_ADAPTER_ADDRESS");
  const ethAdapterPeer = addressToBytes32(ethAdapterAddress);
  const enforcedOptions = buildLzReceiveOption(LZ_RECEIVE_GAS, 0);

  console.log(`Using signer: ${deployer.address}`);
  console.log(
    `Network: chainId=${network?.chainId?.toString() ?? "unknown"} (${network?.name ?? "unknown"})`
  );

  const oft = await ethers.getContractAt("DapposTokenOFT", oftAddress, deployer);
  const owner = await oft.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Signer is not OFT owner. owner=${owner}, signer=${deployer.address}`);
  }

  console.log(`Configuring DapposTokenOFT: ${oftAddress}`);
  console.log(`Setting peer: eid=${ETH_EID}, peer=${ethAdapterPeer}`);
  const setPeerTx = await oft.setPeer(ETH_EID, ethAdapterPeer);
  console.log("setPeer tx:", setPeerTx.hash);
  await setPeerTx.wait();

  console.log(
    `Setting enforced options: eid=${ETH_EID}, msgType=${SEND_MSG_TYPE}, lzReceiveGas=${LZ_RECEIVE_GAS}, options=${enforcedOptions}`
  );
  const setOptionsTx = await oft.setEnforcedOptions([
    {
      eid: ETH_EID,
      msgType: SEND_MSG_TYPE,
      options: enforcedOptions,
    },
  ]);
  console.log("setEnforcedOptions tx:", setOptionsTx.hash);
  await setOptionsTx.wait();

  const savedPeer = await oft.peers(ETH_EID);
  const savedOptions = await oft.enforcedOptions(ETH_EID, SEND_MSG_TYPE);
  console.log(`Saved peer: ${savedPeer}`);
  console.log(`Saved enforced options: ${savedOptions}`);
  console.log("DapposTokenOFT LayerZero config completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
