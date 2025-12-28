# SimpleVault - 去中心化金库

一个基于 BSC 测试网的 DeFi 应用，支持 BNB 存款和线性解锁提取。

## 🎯 功能特性

- 💰 **存入 BNB**：用户可以随时存入 BNB
- 📈 **线性解锁**：每分钟解锁 1%（测试模式）
- 💎 **额外收益**：本金 + 20% 收益
- 🔐 **安全可靠**：智能合约完全去中心化
- 👛 **多钱包支持**：MetaMask、OKX、Binance、TokenPocket

## 🚀 在线体验

**访问地址**：[点击这里](你的GitHub Pages链接)

## 📝 使用说明

1. **连接钱包**：点击"选择钱包"按钮
2. **切换网络**：确保钱包在 BSC Testnet
3. **获取测试币**：从 [BSC Faucet](https://testnet.bnbchain.org/faucet-smart) 领取
4. **存入 BNB**：输入金额并确认交易
5. **等待解锁**：每分钟解锁 1%
6. **提取收益**：随时提取已解锁部分

## 🔗 合约信息

- **合约地址**：`0xe904c5BC6f598163D12FE0b2fBddBBE57cB29FF5`
- **网络**：BSC Testnet
- **浏览器**：[查看合约](https://testnet.bscscan.com/address/0xe904c5BC6f598163D12FE0b2fBddBBE57cB29FF5)

## 💡 解锁规则

- 每分钟解锁 1%
- 100 分钟全部解锁
- 总收益 = 本金 × 120%

**示例**：
- 存入 0.1 BNB
- 1 分钟后可提取：0.0012 BNB
- 10 分钟后可提取：0.012 BNB
- 100 分钟后可提取：0.12 BNB（全部）

## 🛠️ 技术栈

- **智能合约**：Solidity ^0.8.19
- **前端**：原生 JavaScript + ethers.js v6
- **区块链**：Binance Smart Chain Testnet
- **部署**：GitHub Pages

## ⚠️ 免责声明

这是一个测试项目，仅用于学习和演示目的。请勿在主网使用或投入真实资金。

## 📄 开源协议

MIT License
