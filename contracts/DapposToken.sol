// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract DapposToken is ERC20, ERC20Pausable, Ownable {
    constructor(
        address _owner,
        address _treasury,
        uint256 _totalSupply
    ) ERC20("DAPPOS", "DOS") Ownable(_owner) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        require(_totalSupply > 0, "Total supply must be greater than zero");

        _mint(_treasury, _totalSupply);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
