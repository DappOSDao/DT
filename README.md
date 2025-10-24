# DAPPOS Token Cross-Chain Deployment Guide

This repository contains the DAPPOS token implementation with LayerZero V2 cross-chain capabilities using the OFT (Omnichain Fungible Token) standard.

## Architecture Overview

The cross-chain setup consists of three main contracts:

1. **DapposToken.sol** - Standard ERC20 token (deployed on origin chain only)
2. **DapposTokenAdapter.sol** - Adapter contract that wraps the ERC20 for cross-chain transfers (origin chain)
3. **DapposTokenOFT.sol** - OFT contract that represents the token on destination chains

## Deployment Strategy

### Origin Chain: Ethereum Mainnet
Deploy the standard ERC20 token and its adapter to enable cross-chain transfers.

### Destination Chain(s): BSC
Deploy the OFT contract to mint/burn tokens as users bridge in/out.

---

## Step-by-Step Deployment Process

### Step 1: Deploy on Ethereum (Origin Chain)

#### 1.1 Deploy DapposToken
Deploy the standard ERC20 token contract:
- **Constructor Parameters:**
  - `_owner`: Address that will have admin control over the token (can pause/unpause)
  - `_treasury`: Address that will receive the initial token supply
  - `_totalSupply`: Total supply of tokens (e.g., 1,000,000,000 * 10^18)

#### 1.2 Deploy DapposTokenAdapter
Deploy the adapter contract to enable cross-chain functionality:
- **Constructor Parameters:**
  - `_token`: Address of the deployed DapposToken contract
  - `_layerZeroEndpoint`: Ethereum LayerZero Endpoint V2 address
    - Mainnet: `0x1a44076050125825900e736c501f859c50fE728c`
    - Sepolia: `0x6EDCE65403992e310A62460808c4b910D972f10f`
  - `_owner`: Address that will have admin control over the adapter

### Step 2: Deploy on BSC (Destination Chain)

#### 2.1 Deploy DapposTokenOFT
Deploy the OFT contract on BSC:
- **Constructor Parameters:**
  - `_name`: Token name (e.g., "DAPPOS")
  - `_symbol`: Token symbol (e.g., "DOS")
  - `_lzEndpoint`: BSC LayerZero Endpoint V2 address
    - Mainnet: `0x1a44076050125825900e736c501f859c50fE728c`
    - Testnet: `0x6EDCE65403992e310A62460808c4b910D972f10f`
  - `_owner`: Address that will have admin control over the OFT

### Step 3: Configure Cross-Chain Connections

#### 3.1 Set Peer on Ethereum Adapter
Call `setPeer` on the DapposTokenAdapter contract:
- **Function:** `setPeer(uint32 _eid, bytes32 _peer)`
- **Parameters:**
  - `_eid`: BSC Endpoint ID
    - BSC Mainnet: `30102`
    - BSC Testnet: `40102`
  - `_peer`: Address of the BSC OFT contract (converted to bytes32)
    - Format: `bytes32(uint256(uint160(bscOftAddress)))`

#### 3.2 Set Peer on BSC OFT
Call `setPeer` on the DapposTokenOFT contract:
- **Function:** `setPeer(uint32 _eid, bytes32 _peer)`
- **Parameters:**
  - `_eid`: Ethereum Endpoint ID
    - Ethereum Mainnet: `30101`
    - Ethereum Sepolia: `40161`
  - `_peer`: Address of the Ethereum Adapter contract (converted to bytes32)
    - Format: `bytes32(uint256(uint160(ethAdapterAddress)))`

### Step 4: Configure Enforced Options (Optional but Recommended)

Set minimum gas limits to ensure successful cross-chain execution:

#### 4.1 On Ethereum Adapter
```solidity
setEnforcedOptions([{
    eid: 30102,  // BSC
    msgType: 1,  // SEND type
    options: <encoded gas options>
}])
```

#### 4.2 On BSC OFT
```solidity
setEnforcedOptions([{
    eid: 30101,  // Ethereum
    msgType: 1,  // SEND type
    options: <encoded gas options>
}])
```

---

## Cross-Chain Transfer Flow

### From Ethereum to BSC

1. User approves the Adapter contract to spend tokens
   - `DapposToken.approve(adapterAddress, amount)`

2. User calls `send` on the Adapter with:
   - Destination endpoint ID (BSC: 30102)
   - Recipient address
   - Amount to send
   - LayerZero message fee (paid in ETH)

3. **Behind the scenes:**
   - Adapter locks tokens on Ethereum
   - LayerZero relays message to BSC
   - OFT mints equivalent tokens on BSC to recipient

### From BSC to Ethereum

1. User calls `send` on the OFT contract with:
   - Destination endpoint ID (Ethereum: 30101)
   - Recipient address
   - Amount to send
   - LayerZero message fee (paid in BNB)

2. **Behind the scenes:**
   - OFT burns tokens on BSC
   - LayerZero relays message to Ethereum
   - Adapter unlocks equivalent tokens on Ethereum to recipient

---

## LayerZero Endpoint IDs Reference

### Mainnet
| Chain | Endpoint ID |
|-------|-------------|
| Ethereum | 30101 |
| BSC | 30102 |
| Arbitrum | 30110 |
| Optimism | 30111 |
| Polygon | 30109 |
| Avalanche | 30106 |
| Base | 30184 |

### Testnet
| Chain | Endpoint ID |
|-------|-------------|
| Ethereum Sepolia | 40161 |
| BSC Testnet | 40102 |
| Arbitrum Sepolia | 40231 |
| Optimism Sepolia | 40232 |
| Polygon Amoy | 40267 |
| Avalanche Fuji | 40106 |
| Base Sepolia | 40245 |

Full list: [LayerZero V2 Endpoints](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts)

---

## Security Considerations

### Owner Privileges
The owner address has critical permissions including:
- **setPeer**: Configure trusted cross-chain contracts
- **setDelegate**: Manage LayerZero endpoint configurations
- **setEnforcedOptions**: Set minimum gas requirements
- **setMsgInspector**: Configure message inspection logic
- **pause/unpause**: Control token transfers (DapposToken only)

### Best Practices
1. **Use Multi-Signature Wallet**: Deploy with a Gnosis Safe or similar multi-sig as owner
2. **Test on Testnet First**: Validate entire flow on Sepolia/BSC Testnet before mainnet
3. **Set Peer Immediately**: Configure peer connections right after deployment to prevent unauthorized access
4. **Configure Enforced Options**: Set reasonable gas limits to prevent failed transactions
5. **Audit Before Production**: Have contracts audited by reputable security firms
6. **Monitor Cross-Chain Activity**: Track bridge volumes and suspicious patterns

### Rate Limiting
Consider implementing rate limits to prevent:
- Large single-transaction exploits
- Rapid draining attacks
- Flash loan manipulations

---

## Contract Verification

After deployment, verify all contracts on their respective block explorers:
- Ethereum: Etherscan
- BSC: BscScan
- Other chains: Respective block explorers

Verification ensures transparency and allows users to interact directly with contracts.

---

## Additional Resources

- [LayerZero V2 Documentation](https://docs.layerzero.network/v2)
- [OFT Standard](https://docs.layerzero.network/v2/developers/evm/oft/quickstart)
- [LayerZero Endpoint Addresses](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts)

---

## Support

For issues or questions:
- Review LayerZero documentation
- Check contract events for transaction status
- Use LayerZero Scan to track cross-chain messages: https://layerzeroscan.com/

---

## License

This project is licensed under the MIT License.

