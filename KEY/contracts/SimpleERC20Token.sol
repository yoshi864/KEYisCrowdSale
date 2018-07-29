/*
 * Simple ERC20 Contract, what the KEY Token MAY look like
 */

pragma solidity ^0.4.23;

import "./EIP20Interface.sol";

library SafeMath {
	// Copy and paste here...
}

contract KEYToken is EIP20Interface {
	using SafeMath for uint256;

	string public constant symbol = 'KEY';
	string public constant name = 'KEY Token';
	uint8 public constant decimals = 18;

	string public constant version = "KEY 1.0"

	uint256 public constant totalSupply = 226000000 * 10**uint256(decimals);

	uint256 private constant 
