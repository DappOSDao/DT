async function main() {
  const ethers = require("ethers");
  
  // ============================================================================
  // CONFIGURATION - Update these values for your specific transaction
  // ============================================================================
  
  const CONFIG = {
    // ============================================================================
    // 🔧 CONFIGURATION - Fill in your deployed contract addresses
    // ============================================================================
    
    // Recipient address for cross-chain transfer
    recipientAddress: "0x0000000000000000000000000000000000000000", // TODO: Fill in recipient address
    
    // Contract addresses (deployed on respective chains)
    adapterAddress: "0x0000000000000000000000000000000000000000",   // TODO: Fill in Ethereum Adapter address
    oftAddress: "0x0000000000000000000000000000000000000000",       // TODO: Fill in BSC OFT address
    
    // Amount to send (in tokens, not wei)
    amountInTokens: "1",
    slippagePercent: 0.5,
    
    // Manual fee input (in wei) - Leave as "0" for automatic query
    nativeFeeEthToBsc: "0",  // Fee for ETH -> BSC (in wei)
    nativeFeeBscToEth: "0",  // Fee for BSC -> ETH (in wei)
    
    // Chain IDs (LayerZero Endpoint IDs)
    chains: {
      ethereumMainnet: 30101,
      ethereumSepolia: 40161,
      bscMainnet: 30102,
      bscTestnet: 40102,
    }
  };

  // ============================================================================
  // Validate Configuration
  // ============================================================================
  
  console.log("\n" + "=".repeat(80));
  console.log("🚀 DAPPOS Token Cross-Chain Send Parameters Generator");
  console.log("=".repeat(80));
  console.log();
  
  if (CONFIG.recipientAddress === "0x0000000000000000000000000000000000000000") {
    console.log("❌ ERROR: Please fill in recipientAddress in CONFIG");
    console.log("   Open the script and update the recipientAddress field\n");
    process.exit(1);
  }
  
  if (CONFIG.adapterAddress === "0x0000000000000000000000000000000000000000") {
    console.log("❌ ERROR: Please fill in adapterAddress in CONFIG");
    console.log("   This should be your deployed DapposTokenAdapter address on Ethereum\n");
    process.exit(1);
  }
  
  if (CONFIG.oftAddress === "0x0000000000000000000000000000000000000000") {
    console.log("❌ ERROR: Please fill in oftAddress in CONFIG");
    console.log("   This should be your deployed DapposTokenOFT address on BSC\n");
    process.exit(1);
  }
  
  console.log("✅ Configuration validated\n");

  // ============================================================================
  // ETH -> BSC: Construct SendParam for Adapter.send()
  // ============================================================================
  
  console.log("\n" + "=".repeat(80));
  console.log("1. FROM ETHEREUM TO BSC");
  console.log("=".repeat(80));
  
  const amountLD = ethers.utils.parseEther(CONFIG.amountInTokens);
  const minAmountLD = amountLD.mul(Math.floor((100 - CONFIG.slippagePercent) * 100)).div(10000);
  
  // Convert address to bytes32 (left-padded)
  const toBytes32 = ethers.utils.hexZeroPad(CONFIG.recipientAddress, 32);
  
  // Build proper Type 3 options for LayerZero V2
  // Format: TYPE_3(2) + WORKER_ID(1) + option_size(2) + option_type(1) + gas(16) + value(16)
  const TYPE_3 = 3;
  const WORKER_ID = 1;
  const OPTION_TYPE_LZRECEIVE = 1;
  const gas = 65000; // Minimum gas for BSC lzReceive
  const value = 0;
  
  // Encode option data (gas + value)
  const optionData = ethers.utils.solidityPack(['uint128', 'uint128'], [gas, value]);
  // Calculate option size = 1 (option_type) + optionData bytes length
  const optionSize = 1 + (optionData.length - 2) / 2;
  
  // Build complete extraOptions
  const extraOptions = ethers.utils.solidityPack(
    ['uint16', 'uint8', 'uint16', 'uint8'],
    [TYPE_3, WORKER_ID, optionSize, OPTION_TYPE_LZRECEIVE]
  ) + optionData.substring(2); // Remove '0x' prefix
  
  console.log(`\n✅ Using correct extraOptions: ${extraOptions}`);
  
  const sendParamEthToBsc = {
    dstEid: CONFIG.chains.bscMainnet,
    to: toBytes32,
    amountLD: amountLD.toString(),
    minAmountLD: minAmountLD.toString(),
    extraOptions: extraOptions,  // Fixed: was "0x"
    composeMsg: "0x",
    oftCmd: "0x"
  };

  // Query fee automatically via RPC
  console.log("\n🔍 Querying cross-chain fee from Ethereum...");
  let nativeFeeEth = CONFIG.nativeFeeEthToBsc;
  
  if (nativeFeeEth === "0") {
    try {
      const provider = new ethers.providers.JsonRpcProvider("https://eth.llamarpc.com");
      const adapterABI = [
        "function quoteSend(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) _sendParam, bool _payInLzToken) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))"
      ];
      const adapter = new ethers.Contract(CONFIG.adapterAddress, adapterABI, provider);
      
      const result = await adapter.quoteSend([
        sendParamEthToBsc.dstEid,
        sendParamEthToBsc.to,
        sendParamEthToBsc.amountLD,
        sendParamEthToBsc.minAmountLD,
        sendParamEthToBsc.extraOptions,
        sendParamEthToBsc.composeMsg,
        sendParamEthToBsc.oftCmd
      ], false);
      
      nativeFeeEth = result.nativeFee.toString();
      console.log(`✅ Fee queried: ${ethers.utils.formatEther(nativeFeeEth)} ETH`);
    } catch (error) {
      console.log(`❌ Failed to query fee: ${error.message}`);
      console.log("⚠️  You'll need to query manually in Remix");
      nativeFeeEth = "0";
    }
  } else {
    console.log(`✅ Using configured fee: ${ethers.utils.formatEther(nativeFeeEth)} ETH`);
  }
  
  console.log("\n" + "─".repeat(80));
  console.log("📋 STEP 1: Approve Adapter to spend tokens");
  console.log("─".repeat(80));
  console.log("\nContract: DapposToken");
  console.log("Function: approve\n");
  console.log("✂️ COPY & PASTE these parameters:");
  console.log("┌──────────────────────────────────────────────────────────┐");
  console.log(`│ spender:  ${CONFIG.adapterAddress} │`);
  console.log(`│ amount:   ${amountLD.toString().padEnd(42)} │`);
  console.log("└──────────────────────────────────────────────────────────┘");

  console.log("\n" + "─".repeat(80));
  console.log("📋 STEP 2: Execute cross-chain send");
  console.log("─".repeat(80));
  console.log("\nContract: DapposTokenAdapter");
  console.log("Function: send\n");
  
  console.log("✂️ COPY THIS _sendParam (tuple format for Remix):");
  console.log("┌────────────────────────────────────────────────────────────────────┐");
  const sendParamTuple = `[${sendParamEthToBsc.dstEid},"${sendParamEthToBsc.to}",${sendParamEthToBsc.amountLD},${sendParamEthToBsc.minAmountLD},"${sendParamEthToBsc.extraOptions}","${sendParamEthToBsc.composeMsg}","${sendParamEthToBsc.oftCmd}"]`;
  console.log(`│ ${sendParamTuple.padEnd(66)} │`);
  console.log("└────────────────────────────────────────────────────────────────────┘");
  
  console.log("\n✂️ COPY THIS _fee (tuple format for Remix):");
  console.log("┌────────────────────────────────────────────────────────────────────┐");
  const feeTuple = `[${nativeFeeEth},0]`;
  console.log(`│ ${feeTuple.padEnd(66)} │`);
  console.log("└────────────────────────────────────────────────────────────────────┘");
  
  console.log("\n✂️ COPY THIS _refundAddress:");
  console.log("┌─────────────────────────────────────────────────┐");
  console.log(`│ ${CONFIG.recipientAddress} │`);
  console.log("└─────────────────────────────────────────────────┘");

  console.log("\n💰 COPY THIS VALUE (transaction value in ETH):");
  console.log("┌──────────────────────────────────┐");
  if (nativeFeeEth !== "0") {
    console.log(`│ ${ethers.utils.formatEther(nativeFeeEth).padEnd(32)} │`);
  } else {
    console.log(`│ QUERY quoteSend FIRST            │`);
  }
  console.log("└──────────────────────────────────┘");

  // ============================================================================
  // BSC -> ETH: Construct SendParam for OFT.send()
  // ============================================================================
  
  console.log("\n" + "=".repeat(80));
  console.log("2. FROM BSC TO ETHEREUM");
  console.log("=".repeat(80));
  
  const sendParamBscToEth = {
    dstEid: CONFIG.chains.ethereumMainnet,
    to: toBytes32,
    amountLD: amountLD.toString(),
    minAmountLD: minAmountLD.toString(),
    extraOptions: extraOptions,  // Use same correct extraOptions
    composeMsg: "0x",
    oftCmd: "0x"
  };

  // Query fee automatically via RPC
  console.log("\n🔍 Querying cross-chain fee from BSC...");
  let nativeFeeBsc = CONFIG.nativeFeeBscToEth;
  
  if (nativeFeeBsc === "0") {
    try {
      const providerBsc = new ethers.providers.JsonRpcProvider("https://rpc-bsc.48.club");
      const oftABI = [
        "function quoteSend(tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd) _sendParam, bool _payInLzToken) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))"
      ];
      const oft = new ethers.Contract(CONFIG.oftAddress, oftABI, providerBsc);
      
      const result = await oft.quoteSend([
        sendParamBscToEth.dstEid,
        sendParamBscToEth.to,
        sendParamBscToEth.amountLD,
        sendParamBscToEth.minAmountLD,
        sendParamBscToEth.extraOptions,
        sendParamBscToEth.composeMsg,
        sendParamBscToEth.oftCmd
      ], false);
      
      nativeFeeBsc = result.nativeFee.toString();
      console.log(`✅ Fee queried: ${ethers.utils.formatEther(nativeFeeBsc)} BNB`);
    } catch (error) {
      console.log(`❌ Failed to query fee: ${error.message}`);
      console.log("⚠️  You'll need to query manually in Remix");
      nativeFeeBsc = "0";
    }
  } else {
    console.log(`✅ Using configured fee: ${ethers.utils.formatEther(nativeFeeBsc)} BNB`);
  }
  
  console.log("\n" + "─".repeat(80));
  console.log("📋 STEP 1: Execute cross-chain send");
  console.log("─".repeat(80));
  console.log("\nContract: DapposTokenOFT");
  console.log("Function: send\n");
  
  console.log("✂️ COPY THIS _sendParam (tuple format for Remix):");
  console.log("┌────────────────────────────────────────────────────────────────────┐");
  const sendParamTupleBsc = `[${sendParamBscToEth.dstEid},"${sendParamBscToEth.to}",${sendParamBscToEth.amountLD},${sendParamBscToEth.minAmountLD},"${sendParamBscToEth.extraOptions}","${sendParamBscToEth.composeMsg}","${sendParamBscToEth.oftCmd}"]`;
  console.log(`│ ${sendParamTupleBsc.padEnd(66)} │`);
  console.log("└────────────────────────────────────────────────────────────────────┘");
  
  console.log("\n✂️ COPY THIS _fee (tuple format for Remix):");
  console.log("┌────────────────────────────────────────────────────────────────────┐");
  const feeTupleBsc = `[${nativeFeeBsc},0]`;
  console.log(`│ ${feeTupleBsc.padEnd(66)} │`);
  console.log("└────────────────────────────────────────────────────────────────────┘");
  
  console.log("\n✂️ COPY THIS _refundAddress:");
  console.log("┌─────────────────────────────────────────────────┐");
  console.log(`│ ${CONFIG.recipientAddress} │`);
  console.log("└─────────────────────────────────────────────────┘");

  console.log("\n💰 COPY THIS VALUE (transaction value in BNB):");
  console.log("┌──────────────────────────────────────────────┐");
  if (nativeFeeBsc !== "0") {
    console.log(`│ ${ethers.utils.formatEther(nativeFeeBsc).padEnd(44)} │`);
  } else {
    console.log(`│ QUERY quoteSend FIRST                        │`);
  }
  console.log("└──────────────────────────────────────────────┘");

  // ============================================================================
  // Helper: bytes32 conversion examples
  // ============================================================================
  
  console.log("\n" + "=".repeat(80));
  console.log("3. HELPER: Address to bytes32 Conversion");
  console.log("=".repeat(80));
  
  const exampleAddresses = [
    "0x1234567890123456789012345678901234567890",
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Common Hardhat address
  ];
  
  console.log("\nIf you need to convert different addresses to bytes32:");
  exampleAddresses.forEach(addr => {
    console.log(`${addr} -> ${ethers.utils.hexZeroPad(addr, 32)}`);
  });

  // ============================================================================
  // Helper: Amount conversion examples
  // ============================================================================
  
  console.log("\n" + "=".repeat(80));
  console.log("4. HELPER: Token Amount Conversions");
  console.log("=".repeat(80));
  
  const amounts = ["1", "10", "100", "1000", "10000"];
  console.log("\nCommon amount conversions (assuming 18 decimals):");
  amounts.forEach(amt => {
    console.log(`${amt} tokens -> ${ethers.utils.parseEther(amt).toString()} (wei)`);
  });

  // ============================================================================
  // Configuration Summary
  // ============================================================================
  
  console.log("\n" + "=".repeat(80));
  console.log("5. CONFIGURATION SUMMARY");
  console.log("=".repeat(80));
  console.log();
  console.log("Update these values in the script for your transaction:");
  console.log(`  Recipient:        ${CONFIG.recipientAddress}`);
  console.log(`  Amount:           ${CONFIG.amountInTokens} tokens`);
  console.log(`  Slippage:         ${CONFIG.slippagePercent}%`);
  console.log(`  Adapter Address:  ${CONFIG.adapterAddress}`);
  console.log(`  OFT Address:      ${CONFIG.oftAddress}`);
  console.log();
  console.log("LayerZero Endpoint IDs:");
  console.log(`  Ethereum Mainnet: ${CONFIG.chains.ethereumMainnet}`);
  console.log(`  Ethereum Sepolia: ${CONFIG.chains.ethereumSepolia}`);
  console.log(`  BSC Mainnet:      ${CONFIG.chains.bscMainnet}`);
  console.log(`  BSC Testnet:      ${CONFIG.chains.bscTestnet}`);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ Parameters generated successfully!");
  console.log("=".repeat(80));
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

