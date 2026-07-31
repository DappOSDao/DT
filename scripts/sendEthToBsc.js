const { ethers } = require("hardhat");

const ETH_CHAIN_ID = 1;
const BSC_EID = 30102;
const ZERO_BYTES32 = ethers.constants.HashZero;

// Fill before running.
// Token amount in normal units, not wei. For example: "1" means 1 DOS.
const AMOUNT = "1";

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

function resolveAmount() {
  if (!AMOUNT) {
    throw new Error('Missing AMOUNT. Fill AMOUNT in this script, for example: "1".');
  }

  return ethers.utils.parseEther(AMOUNT);
}

async function main() {

  const [sender] = await ethers.getSigners();
  const network = await sender.provider?.getNetwork();
  if (network.chainId !== ETH_CHAIN_ID) {
    throw new Error(`Wrong network. ETH -> BSC must run on ETH chainId=${ETH_CHAIN_ID}, current chainId=${network.chainId}.`);
  }

  const tokenAddress = resolveAddress("ETH_TOKEN_ADDRESS");
  const adapterAddress = resolveAddress("ETH_ADAPTER_ADDRESS");
  const refundAddress = resolveAddress("ETH_SAFE_WALLET_ADDRESS");
  const recipientAddress = resolveAddress("BSC_SAFE_WALLET_ADDRESS");

  const adapter = await ethers.getContractAt("DapposTokenAdapter", adapterAddress, sender);
  const peer = await adapter.peers(BSC_EID);
  if (peer === ZERO_BYTES32) {
    throw new Error(
      `No peer configured for BSC eid=${BSC_EID}. Run scripts/configureDapposTokenAdapter.js on ETH first.`
    );
  }

  const amountLD = resolveAmount();
  const recipientBytes32 = ethers.utils.hexZeroPad(recipientAddress, 32);

  const sendParam = {
    dstEid: BSC_EID,
    to: recipientBytes32,
    amountLD,
    minAmountLD: amountLD,
    extraOptions: "0x",
    composeMsg: "0x",
    oftCmd: "0x",
  };

  console.log(`Sender: ${sender.address}`);
  console.log(`ETH token: ${tokenAddress}`);
  console.log(`ETH adapter: ${adapterAddress}`);
  console.log(`BSC peer: ${peer}`);
  console.log(`Refund on ETH: ${refundAddress}`);
  console.log(`Recipient on BSC: ${recipientAddress}`);
  console.log(`Amount: ${AMOUNT}`);

  console.log("Quoting LayerZero fee...");
  const fee = await adapter.quoteSend(sendParam, false);

  const sendCall = {
    contractName: "DapposTokenAdapter",
    contractAddress: adapterAddress,
    function: "send",
    payableValue: fee.nativeFee.toString(),
    payableValueFormatted: `${ethers.utils.formatEther(fee.nativeFee)} ETH`,
    bridgeAmountFormatted: `${AMOUNT} DOS`,
    args: {
      _sendParam: {
        dstEid: sendParam.dstEid,
        to: sendParam.to,
        amountLD: sendParam.amountLD.toString(),
        minAmountLD: sendParam.minAmountLD.toString(),
        extraOptions: sendParam.extraOptions,
        composeMsg: sendParam.composeMsg,
        oftCmd: sendParam.oftCmd,
      },
      _fee: {
        nativeFee: fee.nativeFee.toString(),
        lzTokenFee: fee.lzTokenFee.toString(),
      },
      _refundAddress: refundAddress,
    },
  };

  console.log("Etherscan send call params:");
  console.log(JSON.stringify(sendCall, null, 2));

  // Uncomment only when you want to send the real transaction from this script.
  // const sendTx = await adapter.send(
  //   sendParam,
  //   {
  //     nativeFee: fee.nativeFee,
  //     lzTokenFee: fee.lzTokenFee,
  //   },
  //   refundAddress,
  //   {
  //     value: fee.nativeFee,
  //   }
  // );
  // console.log("send tx:", sendTx.hash);
  // await sendTx.wait();
  // console.log("ETH -> BSC send submitted.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
