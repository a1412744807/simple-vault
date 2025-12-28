// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * 简单金库合约
 * - 用户存入 BNB
 * - 每天解锁 5%（20天解锁完）
 * - 随时可提取已解锁部分
 */
contract SimpleVault {
    
    struct Deposit {
        uint256 amount;      // 存入金额
        uint256 startTime;   // 存入时间
        uint256 withdrawn;   // 已提取金额
    }
    
    mapping(address => Deposit) public deposits;
    
    uint256 public constant UNLOCK_RATE = 1;     // 每分钟 1%
    uint256 public constant TOTAL_PROFIT = 20;   // 总收益率 20%
    uint256 public constant UNLOCK_INTERVAL = 60; // 1分钟（测试模式）
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    // 存入 BNB
    function deposit() external payable {
        require(msg.value > 0, "Amount must > 0");
        
        Deposit storage d = deposits[msg.sender];
        
        // 如果已有存款，先结算可提取金额
        if (d.amount > 0) {
            uint256 unlocked = getUnlocked(msg.sender);
            d.withdrawn = unlocked; // 更新已提取基准
        }
        
        d.amount += msg.value;
        d.startTime = block.timestamp;
        
        emit Deposited(msg.sender, msg.value);
    }
    
    // 计算已解锁金额（本金 + 20% 收益）
    function getUnlocked(address user) public view returns (uint256) {
        Deposit memory d = deposits[user];
        if (d.amount == 0) return 0;
        
        uint256 intervalsPassed = (block.timestamp - d.startTime) / UNLOCK_INTERVAL;
        uint256 unlockPercent = intervalsPassed * UNLOCK_RATE;
        
        // 最多解锁 100%
        if (unlockPercent > 100) {
            unlockPercent = 100;
        }
        
        // 总金额 = 本金 + 收益（本金的20%）
        uint256 totalAmount = d.amount + (d.amount * TOTAL_PROFIT / 100);
        
        // 按百分比解锁总金额
        return (totalAmount * unlockPercent) / 100;
    }
    
    // 计算可提取金额（已解锁 - 已提取）
    function getWithdrawable(address user) public view returns (uint256) {
        uint256 unlocked = getUnlocked(user);
        uint256 withdrawn = deposits[user].withdrawn;
        
        if (unlocked > withdrawn) {
            return unlocked - withdrawn;
        }
        return 0;
    }
    
    // 提取已解锁的 BNB
    function withdraw() external {
        uint256 withdrawable = getWithdrawable(msg.sender);
        require(withdrawable > 0, "Nothing to withdraw");
        
        deposits[msg.sender].withdrawn += withdrawable;
        
        // 使用 call 替代 transfer（更安全）
        (bool success, ) = payable(msg.sender).call{value: withdrawable}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, withdrawable);
    }
    
    // 查询用户信息
    function getUserInfo(address user) external view returns (
        uint256 deposited,
        uint256 unlocked,
        uint256 withdrawn,
        uint256 withdrawable
    ) {
        Deposit memory d = deposits[user];
        deposited = d.amount;
        unlocked = getUnlocked(user);
        withdrawn = d.withdrawn;
        withdrawable = getWithdrawable(user);
    }
}
