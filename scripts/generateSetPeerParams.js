async function main() {
  const ethers = require("ethers");
  
  // ============================================================================
  // CONFIGURATION - Update these values for your deployed contracts
  // ============================================================================
  
  const CONFIG = {
    // Contract addresses (deployed on respective chains)
    adapterAddress: "0x0000000000000000000000000000000000000000",   // TODO: Fill in Ethereum Adapter address
    oftAddress: "0x0000000000000000000000000000000000000000",       // TODO: Fill in BSC OFT address
    
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
  console.log("🔗 DAPPOS Token setPeer Parameters Generator");
  console.log("=".repeat(80));
  console.log();
  
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
  // Helper function: Calculate peer bytes32 from address
  // ============================================================================
  
  function calcPeer(address) {
    // Convert address to bytes32 (left-padded with zeros)
    return ethers.utils.hexZeroPad(address, 32);
  }

  // ============================================================================
  // 1. Ethereum Adapter: setPeer to BSC OFT
  // ============================================================================
  
  console.log("\n" + "=".repeat(80));
  console.log("1. SET PEER ON ETHEREUM ADAPTER");
  console.log("=".repeat(80));
  console.log("\nThis connects Ethereum Adapter -> BSC OFT\n");
  
  const adapterPeerEid = CONFIG.chains.bscMainnet;
  const adapterPeerBytes32 = calcPeer(CONFIG.oftAddress);
  
  console.log("Contract: DapposTokenAdapter (on Ethereum)");
  console.log("Function: setPeer\n");
  
  console.log("✂️ COPY & PASTE these parameters:");
  console.log("┌────────────────────────────────────────────────────────────────────┐");
  console.log(`│ _eid:  ${adapterPeerEid.toString().padEnd(60)} │`);
  console.log(`│ _peer: ${adapterPeerBytes32.padEnd(60)} │`);
  console.log("└────────────────────────────────────────────────────────────────────┘");

  // ============================================================================
  // 2. BSC OFT: setPeer to Ethereum Adapter
  // ============================================================================
  
  console.log("\n" + "=".repeat(80));
  console.log("2. SET PEER ON BSC OFT");
  console.log("=".repeat(80));
  console.log("\nThis connects BSC OFT -> Ethereum Adapter\n");
  
  const oftPeerEid = CONFIG.chains.ethereumMainnet;
  const oftPeerBytes32 = calcPeer(CONFIG.adapterAddress);
  
  console.log("Contract: DapposTokenOFT (on BSC)");
  console.log("Function: setPeer\n");
  
  console.log("✂️ COPY & PASTE these parameters:");
  console.log("┌────────────────────────────────────────────────────────────────────┐");
  console.log(`│ _eid:  ${oftPeerEid.toString().padEnd(60)} │`);
  console.log(`│ _peer: ${oftPeerBytes32.padEnd(60)} │`);
  console.log("└────────────────────────────────────────────────────────────────────┘");

  // ============================================================================
  // Helper: Show all peer relationships
  // ============================================================================
  
  console.log("\n" + "=".repeat(80));
  console.log("3. PEER RELATIONSHIP SUMMARY");
  console.log("=".repeat(80));
  console.log();
  console.log("Peer connections established:");
  console.log(`  Ethereum Adapter (${CONFIG.adapterAddress})`);
  console.log(`    └─> BSC OFT @ EID ${adapterPeerEid}`);
  console.log(`        Peer: ${adapterPeerBytes32}`);
  console.log();
  console.log(`  BSC OFT (${CONFIG.oftAddress})`);
  console.log(`    └─> Ethereum Adapter @ EID ${oftPeerEid}`);
  console.log(`        Peer: ${oftPeerBytes32}`);

  // ============================================================================
  // Configuration Summary
  // ============================================================================
  
  console.log("\n" + "=".repeat(80));
  console.log("4. CONFIGURATION USED");
  console.log("=".repeat(80));
  console.log();
  console.log("Contract Addresses:");
  console.log(`  Adapter (Ethereum): ${CONFIG.adapterAddress}`);
  console.log(`  OFT (BSC):          ${CONFIG.oftAddress}`);
  console.log();
  console.log("LayerZero Endpoint IDs:");
  console.log(`  Ethereum Mainnet: ${CONFIG.chains.ethereumMainnet}`);
  console.log(`  Ethereum Sepolia: ${CONFIG.chains.ethereumSepolia}`);
  console.log(`  BSC Mainnet:      ${CONFIG.chains.bscMainnet}`);
  console.log(`  BSC Testnet:      ${CONFIG.chains.bscTestnet}`);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ setPeer parameters generated successfully!");
  console.log("=".repeat(80));
  console.log();
  console.log("📝 NEXT STEPS:");
  console.log("   1. Execute setPeer on Ethereum Adapter with parameters from Section 1");
  console.log("   2. Execute setPeer on BSC OFT with parameters from Section 2");
  console.log("   3. Both transactions must succeed for cross-chain transfers to work");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

