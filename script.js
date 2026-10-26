// State Management
const appState = {
  totalSalary: 5000000,
  pockets: {
    bensin: { name: "Pocket Bensin", balance: 700000, limit: 700000 },
    makan: { name: "Makan & Jajan", balance: 1000000, limit: 1000000 },
    emergency: { name: "Dana Darurat", balance: 3300000, limit: 3300000 }
  },
  pendingTransaction: null
};

// Initialize Lucide Icons on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  updateUI();
});

// Format Currency Utility
function formatRupiah(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// Update UI Elements with Current State
function updateUI() {
  const totalBalance = appState.pockets.bensin.balance + 
                       appState.pockets.makan.balance + 
                       appState.pockets.emergency.balance;

  document.getElementById('total-balance').innerText = formatRupiah(totalBalance);
  document.getElementById('bensin-balance').innerText = formatRupiah(appState.pockets.bensin.balance);
  document.getElementById('makan-balance').innerText = formatRupiah(appState.pockets.makan.balance);
  document.getElementById('emergency-balance').innerText = formatRupiah(appState.pockets.emergency.balance);

  // Update Select Dropdown options text
  const select = document.getElementById('select-pocket');
  if (select) {
    select.options[0].text = `Pocket Bensin (Sisa: ${formatRupiah(appState.pockets.bensin.balance)})`;
    select.options[1].text = `Pocket Makan & Jajan (Sisa: ${formatRupiah(appState.pockets.makan.balance)})`;
  }
}

// AI Auto-Split Logic Trigger
function triggerAutoSplit() {
  appState.pockets.bensin.balance = 700000;
  appState.pockets.makan.balance = 1000000;
  appState.pockets.emergency.balance = 3300000;
  
  updateUI();
  
  const tipText = document.getElementById('ai-tip-text');
  tipText.innerText = "AI berhasil mereset dan membagi otomatis gaji Rp 5.000.000 ke dalam Pocket Bensin (700rb), Makan (1jt), dan Dana Darurat (3.3jt).";
  
  alert("AI Auto-Split Berhasil! Gaji telah dialokasikan otomatis.");
}

// Payment Modal Controls
function openPaymentModal() {
  document.getElementById('modal-payment').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('modal-payment').classList.add('hidden');
  document.getElementById('input-amount').value = '';
}

function closeOverlimitModal() {
  document.getElementById('modal-overlimit').classList.add('hidden');
  appState.pendingTransaction = null;
}

// Process Payment Logic
function processPayment() {
  const selectedKey = document.getElementById('select-pocket').value;
  const amount = parseInt(document.getElementById('input-amount').value);

  if (!amount || amount <= 0) {
    alert("Masukkan nominal pembayaran yang valid!");
    return;
  }

  const selectedPocket = appState.pockets[selectedKey];

  // Case 1: Sufficient Balance
  if (selectedPocket.balance >= amount) {
    selectedPocket.balance -= amount;
    updateUI();
    closePaymentModal();
    alert(`Pembayaran sebesar ${formatRupiah(amount)} menggunakan ${selectedPocket.name} BERHASIL!`);
  } 
  // Case 2: Overlimit Detected -> Trigger AI Fallback Modal
  else {
    const shortage = amount - selectedPocket.balance;

    if (appState.pockets.emergency.balance < shortage) {
      alert("Transaksi gagal! Saldo Pocket dan Dana Darurat tidak mencukupi.");
      return;
    }

    appState.pendingTransaction = {
      pocketKey: selectedKey,
      amount: amount,
      shortage: shortage,
      pocketBalance: selectedPocket.balance
    };

    // Render details to Overlimit Modal
    document.getElementById('ov-total').innerText = formatRupiah(amount);
    document.getElementById('ov-pocket-balance').innerText = formatRupiah(selectedPocket.balance);
    document.getElementById('ov-shortage').innerText = formatRupiah(shortage);

    closePaymentModal();
    document.getElementById('modal-overlimit').classList.remove('hidden');
  }
}

// Confirm Fallback using Emergency Buffer Wallet
function confirmEmergencyFallback() {
  if (!appState.pendingTransaction) return;

  const { pocketKey, amount, shortage, pocketBalance } = appState.pendingTransaction;

  // Deduct remaining pocket balance to 0 and take shortage from emergency
  appState.pockets[pocketKey].balance = 0;
  appState.pockets.emergency.balance -= shortage;

  updateUI();
  closeOverlimitModal();

  const tipText = document.getElementById('ai-tip-text');
  tipText.innerText = `AI mendeteksi overlimit pada ${appState.pockets[pocketKey].name}. Kekurangan ${formatRupiah(shortage)} berhasil ditarik dari Dana Darurat.`;

  alert(`Pembayaran Berhasil! ${formatRupiah(pocketBalance)} diambil dari ${appState.pockets[pocketKey].name} dan ${formatRupiah(shortage)} diambil dari Dana Darurat.`);
}