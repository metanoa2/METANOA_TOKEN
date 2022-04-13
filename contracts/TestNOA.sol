// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestNOA is ERC20, Ownable {
    uint256 private constant _initialSupply = 1_000_000_000e18;

    constructor() ERC20("NOA", "NOA") {
        _mint(_msgSender(), _initialSupply);
    }
}
