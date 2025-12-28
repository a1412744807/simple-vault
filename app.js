/**
 * Simple Vault - 前端交互
 * 支持多钱包连接：MetaMask、OKX、Binance、TokenPocket
 */

// ========== 配置 ==========

const CONTRACT_ADDRESS = '0xe904c5BC6f598163D12FE0b2fBddBBE57cB29FF5';

const ABI = [
    'function deposit() external payable',
    'function withdraw() external',
    'function getUserInfo(address) view returns (uint256 deposited, uint256 unlocked, uint256 withdrawn, uint256 withdrawable)',
    'function deposits(address) view returns (uint256 amount, uint256 startTime, uint256 withdrawn)'
];

// ========== 状态 ==========

let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let userDepositData = null; // 缓存用户存款数据
let liveUpdateInterval = null; // 实时更新定时器

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成');
    
    if (typeof ethers === 'undefined') {
        showToast('ethers.js 加载失败', 'error');
        return;
    }
    
    // 绑定按钮
    document.getElementById('connectBtn').onclick = openModal;
    document.getElementById('depositBtn').onclick = deposit;
    document.getElementById('withdrawBtn').onclick = withdraw;
    document.getElementById('maxBtn').onclick = setMax;
    
    // 每30秒刷新一次区块链数据（校准）
    setInterval(() => {
        if (contract) updateData();
    }, 30000);
    
    // 点击弹窗外部关闭
    document.getElementById('walletModal').onclick = (e) => {
        if (e.target.id === 'walletModal') closeModal();
    };
    
    // 自动连接（如果之前已连接）
    autoConnect();
});

// ========== 弹窗控制 ==========

function openModal() {
    document.getElementById('walletModal').classList.add('show');
}

function closeModal() {
    document.getElementById('walletModal').classList.remove('show');
}

// ========== 钱包检测 ==========

function getWalletProvider(walletType) {
    // 先打印所有可用的钱包对象
    console.log('=== 钱包检测 ===');
    console.log('window.ethereum:', window.ethereum);
    console.log('window.ethereum?.isMetaMask:', window.ethereum?.isMetaMask);
    console.log('window.ethereum?.providers:', window.ethereum?.providers);
    console.log('window.okxwallet:', window.okxwallet);
    console.log('window.BinanceChain:', window.BinanceChain);
    console.log('window.ethereum?.isTokenPocket:', window.ethereum?.isTokenPocket);
    
    switch(walletType) {
        case 'metamask':
            // 先检查 providers 数组（多钱包共存时）
            if (window.ethereum?.providers) {
                const metamask = window.ethereum.providers.find(p => p.isMetaMask);
                if (metamask) return metamask;
            }
            // 再检查直接的 ethereum 对象
            if (window.ethereum?.isMetaMask) {
                return window.ethereum;
            }
            // 最后尝试直接返回 ethereum（可能被其他钱包覆盖了 isMetaMask）
            if (window.ethereum) {
                return window.ethereum;
            }
            break;
            
        case 'okx':
            if (window.okxwallet) {
                return window.okxwallet;
            }
            // OKX 也可能注入到 ethereum
            if (window.ethereum?.isOkxWallet || window.ethereum?.isOKExWallet) {
                return window.ethereum;
            }
            break;
            
        case 'binance':
            if (window.BinanceChain) {
                return window.BinanceChain;
            }
            // 币安钱包可能也注入到 ethereum
            if (window.ethereum?.isBinance) {
                return window.ethereum;
            }
            break;
            
        case 'tokenpocket':
            if (window.ethereum?.isTokenPocket) {
                return window.ethereum;
            }
            if (window.tokenpocket) {
                return window.tokenpocket.ethereum;
            }
            break;
    }
    
    console.log('未找到对应钱包，尝试使用通用 ethereum');
    // 如果都没找到，但有 ethereum 对象，就用它
    return window.ethereum || null;
}

// ========== 连接钱包 ==========

async function connectWallet(walletType) {
    console.log('尝试连接:', walletType);
    
    const walletProvider = getWalletProvider(walletType);
    
    if (!walletProvider) {
        const walletNames = {
            metamask: 'MetaMask',
            okx: 'OKX Wallet', 
            binance: 'Binance Wallet',
            tokenpocket: 'TokenPocket'
        };
        showToast(`请先安装 ${walletNames[walletType]}`, 'error');
        return;
    }
    
    closeModal();
    
    const btn = document.getElementById('connectBtn');
    btn.disabled = true;
    btn.textContent = '连接中...';
    
    try {
        // 请求连接
        const accounts = await walletProvider.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length === 0) {
            throw new Error('未获取到账户');
        }
        
        userAddress = accounts[0];
        
        // 初始化 ethers
        provider = new ethers.BrowserProvider(walletProvider);
        signer = await provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        
        // 保存使用的钱包类型
        localStorage.setItem('lastWallet', walletType);
        
        // 更新 UI
        updateStatus(true);
        await updateBalance();
        
        // 监听变化
        walletProvider.on('accountsChanged', () => location.reload());
        walletProvider.on('chainChanged', () => location.reload());
        
        showToast('连接成功!', 'success');
        
    } catch (err) {
        console.error('连接失败:', err);
        showToast('连接失败: ' + (err.message || '用户取消'), 'error');
        btn.disabled = false;
        btn.textContent = '连接钱包';
    }
}

// 自动连接上次使用的钱包
async function autoConnect() {
    const lastWallet = localStorage.getItem('lastWallet');
    if (!lastWallet) return;
    
    const walletProvider = getWalletProvider(lastWallet);
    if (!walletProvider) return;
    
    try {
        const accounts = await walletProvider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            connectWallet(lastWallet);
        }
    } catch (e) {
        console.log('自动连接失败');
    }
}

// ========== 余额更新 ==========

async function updateBalance() {
    if (!userAddress || !provider) return;
    
    try {
        const balance = await provider.getBalance(userAddress);
        document.getElementById('walletBalance').textContent = formatBNB(balance);
        document.getElementById('depositBtn').disabled = false;
    } catch (err) {
        console.error('获取余额失败:', err);
    }
}

// ========== 存入 ==========

async function deposit() {
    const amount = document.getElementById('depositAmount').value;
    
    if (!amount || amount <= 0) {
        showToast('请输入有效金额', 'error');
        return;
    }
    
    try {
        setLoading('depositBtn', true);
        
        const tx = await contract.deposit({
            value: ethers.parseEther(amount)
        });
        
        showToast('交易已提交...', 'success');
        await tx.wait();
        
        showToast('存入成功！', 'success');
        document.getElementById('depositAmount').value = '';
        updateData();
        
    } catch (err) {
        showToast('存入失败: ' + (err.reason || err.message), 'error');
    } finally {
        setLoading('depositBtn', false);
    }
}

// ========== 提取 ==========

async function withdraw() {
    try {
        setLoading('withdrawBtn', true);
        
        const tx = await contract.withdraw();
        
        showToast('交易已提交...', 'success');
        await tx.wait();
        
        showToast('提取成功！', 'success');
        updateData();
        
    } catch (err) {
        showToast('提取失败: ' + (err.reason || err.message), 'error');
    } finally {
        setLoading('withdrawBtn', false);
    }
}

// ========== 数据更新 ==========

// 实时计算已解锁金额（每秒调用）
function calculateLiveUnlocked() {
    if (!userDepositData || userDepositData.deposited === 0) return;
    
    const depositAmount = userDepositData.deposited;
    const startTime = userDepositData.startTime;
    const withdrawn = userDepositData.withdrawn;
    
    // 计算已经过去的秒数
    const now = Math.floor(Date.now() / 1000);
    const secondsPassed = now - startTime;
    
    // 每60秒解锁1%，总共120%
    const unlockPercent = Math.min((secondsPassed / 60) * 1, 100);
    const totalAmount = depositAmount * 1.2; // 本金 + 20%收益
    const unlocked = (totalAmount * unlockPercent) / 100;
    
    // 计算可提取金额
    const withdrawable = Math.max(0, unlocked - withdrawn);
    
    // 平滑更新显示（不使用动画，直接设置）
    document.getElementById('unlocked').textContent = unlocked.toFixed(6);
    document.getElementById('withdrawable').textContent = withdrawable.toFixed(6);
    
    // 更新提取按钮状态
    document.getElementById('withdrawBtn').disabled = withdrawable <= 0;
}

// 启动实时更新
function startLiveUpdate() {
    // 清除旧的定时器
    if (liveUpdateInterval) {
        clearInterval(liveUpdateInterval);
    }
    
    // 每秒更新一次
    liveUpdateInterval = setInterval(calculateLiveUnlocked, 1000);
}

// 停止实时更新
function stopLiveUpdate() {
    if (liveUpdateInterval) {
        clearInterval(liveUpdateInterval);
        liveUpdateInterval = null;
    }
}

async function updateData() {
    if (!userAddress) return;
    
    try {
        const balance = await provider.getBalance(userAddress);
        animateNumber('walletBalance', parseFloat(ethers.formatEther(balance)));
        
        const info = await contract.getUserInfo(userAddress);
        const deposit = await contract.deposits(userAddress);
        
        // 缓存用户数据用于实时计算
        userDepositData = {
            deposited: parseFloat(ethers.formatEther(info.deposited)),
            startTime: Number(deposit.startTime),
            withdrawn: parseFloat(ethers.formatEther(info.withdrawn))
        };
        
        // 更新已存入金额
        animateNumber('deposited', userDepositData.deposited);
        
        // 已提取金额
        animateNumber('withdrawn', userDepositData.withdrawn);
        
        // 如果有存款，启动实时更新
        if (userDepositData.deposited > 0) {
            calculateLiveUnlocked(); // 立即计算一次
            startLiveUpdate(); // 启动定时器
        } else {
            stopLiveUpdate();
            document.getElementById('unlocked').textContent = '0.000000';
            document.getElementById('withdrawable').textContent = '0.000000';
        }
        
        document.getElementById('depositBtn').disabled = false;
        
    } catch (err) {
        console.error('更新数据失败:', err);
    }
}

// ========== 辅助函数 ==========

function setMax() {
    const balance = document.getElementById('walletBalance').textContent;
    const max = Math.max(0, parseFloat(balance) - 0.001).toFixed(6);
    document.getElementById('depositAmount').value = max;
}

function updateStatus(connected) {
    const status = document.getElementById('status');
    const btn = document.getElementById('connectBtn');
    
    if (connected) {
        status.className = 'status connected';
        status.textContent = '已连接: ' + userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
        btn.textContent = '已连接';
        btn.disabled = true;
    } else {
        status.className = 'status disconnected';
        status.textContent = '未连接钱包';
        btn.textContent = '连接钱包';
        btn.disabled = false;
    }
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    btn.disabled = loading;
    btn.textContent = loading ? '处理中...' : (btnId === 'depositBtn' ? '存入' : '提取');
}

function formatBNB(wei) {
    return parseFloat(ethers.formatEther(wei)).toFixed(6);
}

// 数字增长动画效果
function animateNumber(elementId, targetValue, duration = 800) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseFloat(element.textContent) || 0;
    const difference = targetValue - startValue;
    
    // 如果差异太小，直接设置
    if (Math.abs(difference) < 0.0001) {
        element.textContent = targetValue.toFixed(4);
        return;
    }
    
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数（easeOutCubic）
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (difference * easeProgress);
        
        element.textContent = currentValue.toFixed(6);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = targetValue.toFixed(6);
        }
    }
    
    requestAnimationFrame(update);
}

function showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.className = 'toast', 3000);
}
