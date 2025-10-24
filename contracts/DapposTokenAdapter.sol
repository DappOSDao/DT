// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OFTAdapter} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFTAdapter.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract DapposTokenAdapter is OFTAdapter {
    constructor(
        address _token,
        address _layerZeroEndpoint,
        address _owner
    ) OFTAdapter(_token, _layerZeroEndpoint, _owner) Ownable(_owner) {}
}
