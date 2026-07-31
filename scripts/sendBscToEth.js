const { ethers } = require("hardhat");

const BSC_CHAIN_ID = 56;
const ETH_EID = 30101;
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
  if (network.chainId !== BSC_CHAIN_ID) {
    throw new Error(`Wrong network. BSC -> ETH must run on BSC chainId=${BSC_CHAIN_ID}, current chainId=${network.chainId}.`);
  }

  const oftAddress = resolveAddress("BSC_OFT_ADDRESS");
  const refundAddress = resolveAddress("BSC_SAFE_WALLET_ADDRESS");
  const recipientAddress = resolveAddress("ETH_SAFE_WALLET_ADDRESS");
  const oft = await ethers.getContractAt("DapposTokenOFT", oftAddress, sender);
  const peer = await oft.peers(ETH_EID);
  if (peer === ZERO_BYTES32) {
    throw new Error(
      `No peer configured for ETH eid=${ETH_EID}. Run scripts/configureDapposTokenOFT.js on BSC first.`
    );
  }

  const amountLD = resolveAmount();
  const recipientBytes32 = ethers.utils.hexZeroPad(recipientAddress, 32);

  const sendParam = {
    dstEid: ETH_EID,
    to: recipientBytes32,
    amountLD,
    minAmountLD: amountLD,
    extraOptions: "0x",
    composeMsg: "0x",
    oftCmd: "0x",
  };

  console.log(`Sender: ${sender.address}`);
  console.log(`BSC OFT: ${oftAddress}`);
  console.log(`ETH peer: ${peer}`);
  console.log(`Refund on BSC: ${refundAddress}`);
  console.log(`Recipient on ETH: ${recipientAddress}`);
  console.log(`Amount: ${AMOUNT}`);

  console.log("Quoting LayerZero fee...");
  const fee = await oft.quoteSend(sendParam, false);

  const sendCall = {
    contractName: "DapposTokenOFT",
    contractAddress: oftAddress,
    function: "send",
    payableValue: fee.nativeFee.toString(),
    payableValueFormatted: `${ethers.utils.formatEther(fee.nativeFee)} BNB`,
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

  console.log("BscScan send call params:");
  console.log(JSON.stringify(sendCall, null, 2));

  // Uncomment only when you want to send the real transaction from this script.
  // const sendTx = await oft.send(
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
  // console.log("BSC -> ETH send submitted.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
