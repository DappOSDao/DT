const { ethers } = require("hardhat");

const ETH_CHAIN_ID = 1;
const BSC_EID = 30102;
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
  if (network.chainId !== ETH_CHAIN_ID) {
    throw new Error(`Wrong network. DapposTokenAdapter must be configured on ETH chainId=${ETH_CHAIN_ID}, current chainId=${network.chainId}.`);
  }

  const adapterAddress = resolveAddress("ETH_ADAPTER_ADDRESS");
  const bscOftAddress = resolveAddress("BSC_OFT_ADDRESS");
  const bscOftPeer = addressToBytes32(bscOftAddress);
  const enforcedOptions = buildLzReceiveOption(LZ_RECEIVE_GAS, 0);

  console.log(`Using signer: ${deployer.address}`);
  console.log(
    `Network: chainId=${network?.chainId?.toString() ?? "unknown"} (${network?.name ?? "unknown"})`
  );

  const adapter = await ethers.getContractAt("DapposTokenAdapter", adapterAddress, deployer);
  const owner = await adapter.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Signer is not adapter owner. owner=${owner}, signer=${deployer.address}`);
  }

  console.log(`Configuring DapposTokenAdapter: ${adapterAddress}`);
  console.log(`Setting peer: eid=${BSC_EID}, peer=${bscOftPeer}`);
  const setPeerTx = await adapter.setPeer(BSC_EID, bscOftPeer);
  console.log("setPeer tx:", setPeerTx.hash);
  await setPeerTx.wait();

  console.log(
    `Setting enforced options: eid=${BSC_EID}, msgType=${SEND_MSG_TYPE}, lzReceiveGas=${LZ_RECEIVE_GAS}, options=${enforcedOptions}`
  );
  const setOptionsTx = await adapter.setEnforcedOptions([
    {
      eid: BSC_EID,
      msgType: SEND_MSG_TYPE,
      options: enforcedOptions,
    },
  ]);
  console.log("setEnforcedOptions tx:", setOptionsTx.hash);
  await setOptionsTx.wait();

  const savedPeer = await adapter.peers(BSC_EID);
  const savedOptions = await adapter.enforcedOptions(BSC_EID, SEND_MSG_TYPE);
  console.log(`Saved peer: ${savedPeer}`);
  console.log(`Saved enforced options: ${savedOptions}`);
  console.log("DapposTokenAdapter LayerZero config completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
