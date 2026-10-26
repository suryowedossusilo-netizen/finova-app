// Finova interactive demo — balances, actions, history, and local persistence.
const STORAGE_KEY = "finova_demo_state_v2";

const defaultState = () => ({
  totalSalary: 5000000,
  pockets: {
    bensin: { name: "Pocket Bensin", balance: 700000, limit: 700000, icon: "fuel" },
    makan: { name: "Makan & Jajan", balance: 1000000, limit: 1000000, icon: "utensils" },
    emergency: { name: "Dana Darurat", balance: 3300000, limit: 3300000, icon: "shield-alert" }
  },
  transactions: [],
  profileName: "Suryo Wedo",
  pendingTransaction: null
});

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState();
    const parsed = JSON.parse(saved);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      pockets: { ...base.pockets, ...(parsed.pockets || {}) },
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
    };
  } catch (error) {
    console.warn("Finova: state could not be loaded; using defaults.", error);
    return defaultState();
  }
}

const appState = loadState();

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
  ensureHistorySection();
  bindExistingControls();
  updateUI();
});

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (error) {
    console.warn("Finova: state could not be saved.", error);
  }
}

function formatRupiah(amount) {
  return "Rp " + Math.max(0, Number(amount) || 0).toLocaleString("id-ID");
}

function getTotalBalance() {
  return Object.values(appState.pockets).reduce((sum, pocket) => sum + (Number(pocket.balance) || 0), 0);
}

function addTransaction(type, amount, description, pocketName) {
  appState.transactions.unshift({
    id: Date.now() + Math.random(),
    type,
    amount: Number(amount),
    description,
    pocketName,
    date: new Date().toISOString()
  });
  appState.transactions = appState.transactions.slice(0, 50);
  persistState();
  renderTransactions();
}

function updateUI() {
  const total = document.getElementById("total-balance");
  if (total) total.innerText = formatRupiah(getTotalBalance());

  const fixedIds = { bensin: "bensin-balance", makan: "makan-balance", emergency: "emergency-balance" };
  Object.entries(fixedIds).forEach(([key, id]) => {
    const element = document.getElementById(id);
    if (element && appState.pockets[key]) element.innerText = formatRupiah(appState.pockets[key].balance);
  });

  const salaryLabel = document.querySelector("section.finova-gradient .bg-white\\/10 .text-emerald-300");
  if (salaryLabel) salaryLabel.textContent = formatRupiah(appState.totalSalary);

  const headerName = document.querySelector("header h1");
  if (headerName) headerName.textContent = appState.profileName || "Pengguna Finova";

  updatePocketSelect();
  renderCustomPockets();
  renderTransactions();
  persistState();
  if (window.lucide) lucide.createIcons();
}

function updatePocketSelect() {
  const select = document.getElementById("select-pocket");
  if (!select) return;
  const previous = select.value;
  select.innerHTML = "";
  Object.entries(appState.pockets).forEach(([key, pocket]) => {
    // Dana darurat can be selected for a normal payment, but cannot fund itself via fallback.
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${pocket.name} (Sisa: ${formatRupiah(pocket.balance)})`;
    select.appendChild(option);
  });
  if (appState.pockets[previous]) select.value = previous;
}

function renderCustomPockets() {
  const known = new Set(["bensin", "makan", "emergency"]);
  const containers = [...document.querySelectorAll("main section")];
  const pocketSection = containers.find(section => section.querySelector("h3")?.textContent.includes("Daftar Pocket"));
  if (!pocketSection) return;
  let customContainer = document.getElementById("custom-pocket-list");
  if (!customContainer) {
    customContainer = document.createElement("div");
    customContainer.id = "custom-pocket-list";
    customContainer.className = "space-y-2.5";
    const pocketList = pocketSection.querySelector(".space-y-2\\.5");
    if (pocketList) pocketList.after(customContainer);
    else pocketSection.appendChild(customContainer);
  }
  customContainer.innerHTML = "";
  Object.entries(appState.pockets).filter(([key]) => !known.has(key)).forEach(([key, pocket]) => {
    const card = document.createElement("div");
    card.className = "bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between";
    card.innerHTML = `<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600"><i data-lucide="wallet" class="w-5 h-5"></i></div><div><h4 class="font-semibold text-slate-800 text-xs"></h4><p class="text-[10px] text-slate-400"></p></div></div><div class="text-right"><p class="font-bold text-xs text-slate-800"></p><button type="button" class="text-[10px] text-blue-600 font-semibold mt-1">Kelola</button></div>`;
    card.querySelector("h4").textContent = pocket.name;
    card.querySelector(".text-slate-400").textContent = "Limit: " + formatRupiah(pocket.limit);
    card.querySelector(".font-bold.text-xs").textContent = formatRupiah(pocket.balance);
    card.querySelector("button").addEventListener("click", () => openActionModal("manage", key));
    customContainer.appendChild(card);
  });
}

function ensureHistorySection() {
  if (document.getElementById("finova-history")) return;
  const main = document.querySelector("main");
  const advice = document.getElementById("ai-tip-text")?.closest("section");
  if (!main || !advice) return;
  const section = document.createElement("section");
  section.id = "finova-history";
  section.className = "bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3";
  section.innerHTML = `<div class="flex items-center justify-between"><div><h3 class="font-bold text-slate-800 text-sm">Aktivitas Terakhir</h3><p class="text-[11px] text-slate-400">Riwayat transaksi simulasi</p></div><button type="button" id="btn-all-transactions" class="text-xs text-blue-600 font-semibold">Lihat semua</button></div><div id="finova-transactions" class="space-y-2"><p class="text-xs text-slate-400 py-2">Belum ada transaksi. Coba Bayar, Transfer, atau Top Up.</p></div>`;
  advice.before(section);
  document.getElementById("btn-all-transactions").addEventListener("click", () => openActionModal("history"));
}

function renderTransactions() {
  const container = document.getElementById("finova-transactions");
  if (!container) return;
  container.innerHTML = "";
  if (!appState.transactions.length) {
    const empty = document.createElement("p");
    empty.className = "text-xs text-slate-400 py-2";
    empty.textContent = "Belum ada transaksi. Coba Bayar, Transfer, atau Top Up.";
    container.appendChild(empty);
    return;
  }
  appState.transactions.slice(0, 4).forEach(tx => {
    const row = document.createElement("div");
    row.className = "flex items-center gap-3 py-2 border-b border-slate-50 last:border-0";
    const incoming = ["Top Up", "Gaji Masuk"].includes(tx.type);
    row.innerHTML = `<div class="w-9 h-9 rounded-xl flex items-center justify-center ${incoming ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}"><i data-lucide="${incoming ? "arrow-down-left" : "arrow-up-right"}" class="w-4 h-4"></i></div><div class="flex-1 min-w-0"><p class="text-xs font-semibold text-slate-700 truncate"></p><p class="text-[10px] text-slate-400"></p></div><p class="text-xs font-bold ${incoming ? "text-emerald-600" : "text-slate-700"}"></p>`;
    row.querySelector(".font-semibold").textContent = tx.description;
    row.querySelector(".text-slate-400").textContent = `${tx.pocketName || ""} • ${new Date(tx.date).toLocaleDateString("id-ID")}`;
    row.querySelector(".font-bold").textContent = `${incoming ? "+" : "-"}${formatRupiah(tx.amount)}`;
    container.appendChild(row);
  });
}

function bindExistingControls() {
  // Connect controls that were previously visual-only.
  const buttons = [...document.querySelectorAll("button")];
  buttons.forEach(button => {
    const label = button.innerText.trim().replace(/\\s+/g, " ").toLowerCase();
    if (button.onclick || button.dataset.finovaBound) return;
    button.dataset.finovaBound = "true";

    if (label === "transfer") button.addEventListener("click", () => openActionModal("transfer"));
    else if (label === "top up") button.addEventListener("click", () => openActionModal("topup"));
    else if (label === "lainnya") button.addEventListener("click", () => openActionModal("more"));
    else if (label.includes("buat pocket")) button.addEventListener("click", () => openActionModal("create-pocket"));
    else if (button.querySelector('[data-lucide="bell"]')) button.addEventListener("click", () => openActionModal("notifications"));
    else if (label === "home") button.addEventListener("click", () => { window.scrollTo({ top: 0, behavior: "smooth" }); document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" }); });
    else if (label === "pockets") button.addEventListener("click", () => document.querySelector("main section h3")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    else if (label === "analisis") button.addEventListener("click", () => openActionModal("analysis"));
    else if (label === "profil") button.addEventListener("click", () => openActionModal("profile"));
  });
}

function triggerAutoSplit() {
  appState.pockets.bensin.balance = 700000;
  appState.pockets.makan.balance = 1000000;
  appState.pockets.emergency.balance = 3300000;
  appState.totalSalary = 5000000;
  updateUI();
  const tipText = document.getElementById("ai-tip-text");
  if (tipText) tipText.innerText = "AI berhasil membagi simulasi gaji Rp 5.000.000 ke Pocket Bensin (Rp 700.000), Makan & Jajan (Rp 1.000.000), dan Dana Darurat (Rp 3.300.000).";
  addTransaction("Gaji Masuk", 5000000, "AI Auto-Split gaji", "Semua pocket");
  showToast("AI Auto-Split berhasil dijalankan.");
}

function openPaymentModal() {
  updatePocketSelect();
  document.getElementById("modal-payment")?.classList.remove("hidden");
  setTimeout(() => document.getElementById("input-amount")?.focus(), 50);
}

function closePaymentModal() {
  document.getElementById("modal-payment")?.classList.add("hidden");
  const amount = document.getElementById("input-amount");
  if (amount) amount.value = "";
}

function closeOverlimitModal() {
  document.getElementById("modal-overlimit")?.classList.add("hidden");
  appState.pendingTransaction = null;
}

function processPayment() {
  const selectedKey = document.getElementById("select-pocket")?.value;
  const amount = Number(document.getElementById("input-amount")?.value);
  if (!Number.isFinite(amount) || amount <= 0) return showToast("Masukkan nominal pembayaran yang valid.");
  const selectedPocket = appState.pockets[selectedKey];
  if (!selectedPocket) return showToast("Pocket tidak ditemukan.");
  if (selectedPocket.balance >= amount) {
    selectedPocket.balance -= amount;
    addTransaction("Pembayaran", amount, "Pembayaran QRIS / merchant", selectedPocket.name);
    updateUI();
    closePaymentModal();
    showToast(`Pembayaran ${formatRupiah(amount)} berhasil.`);
    return;
  }
  const shortage = amount - selectedPocket.balance;
  if (selectedKey === "emergency" || appState.pockets.emergency.balance < shortage) {
    return showToast("Saldo pocket dan Dana Darurat tidak mencukupi.");
  }
  appState.pendingTransaction = { pocketKey: selectedKey, amount, shortage, pocketBalance: selectedPocket.balance };
  document.getElementById("ov-total").innerText = formatRupiah(amount);
  document.getElementById("ov-pocket-balance").innerText = formatRupiah(selectedPocket.balance);
  document.getElementById("ov-shortage").innerText = formatRupiah(shortage);
  closePaymentModal();
  document.getElementById("modal-overlimit")?.classList.remove("hidden");
}

function confirmEmergencyFallback() {
  if (!appState.pendingTransaction) return;
  const { pocketKey, amount, shortage, pocketBalance } = appState.pendingTransaction;
  appState.pockets[pocketKey].balance = 0;
  appState.pockets.emergency.balance -= shortage;
  const name = appState.pockets[pocketKey].name;
  addTransaction("Pembayaran", amount, "Pembayaran dengan bantuan Dana Darurat", name);
  updateUI();
  closeOverlimitModal();
  const tipText = document.getElementById("ai-tip-text");
  if (tipText) tipText.innerText = `AI mendeteksi overlimit pada ${name}. Kekurangan ${formatRupiah(shortage)} diambil dari Dana Darurat.`;
  showToast(`Pembayaran berhasil. ${formatRupiah(pocketBalance)} dari ${name}, ${formatRupiah(shortage)} dari Dana Darurat.`);
}

function openActionModal(type, pocketKey = null) {
  document.getElementById("finova-action-modal")?.remove();
  const titles = {
    transfer: "Transfer Antar Pocket",
    topup: "Top Up Pocket",
    "create-pocket": "Buat Pocket Baru",
    more: "Aksi Lainnya",
    notifications: "Notifikasi",
    analysis: "Analisis Keuangan",
    profile: "Profil Finova",
    history: "Semua Transaksi",
    manage: "Kelola Pocket"
  };
  const overlay = document.createElement("div");
  overlay.id = "finova-action-modal";
  overlay.className = "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center p-0 md:p-4";
  overlay.innerHTML = `<div class="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl"><div class="flex justify-between items-center border-b border-slate-100 pb-3"><h3 class="font-bold text-slate-800 text-sm"></h3><button type="button" id="finova-modal-close" class="text-slate-400 hover:text-slate-700 text-xl" aria-label="Tutup">×</button></div><div id="finova-action-content" class="space-y-3"></div></div>`;
  overlay.querySelector("h3").textContent = titles[type] || "Finova";
  document.body.appendChild(overlay);
  overlay.querySelector("#finova-modal-close").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });
  const content = overlay.querySelector("#finova-action-content");
  const fieldClass = "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500";
  const buttonClass = "w-full finova-gradient text-white font-bold py-3 rounded-xl text-sm";
  const selectField = (id, label, exclude = []) => {
    const wrap = document.createElement("label");
    wrap.className = "block text-xs font-medium text-slate-500 space-y-1";
    const title = document.createElement("span"); title.textContent = label; wrap.appendChild(title);
    const select = document.createElement("select"); select.id = id; select.className = fieldClass;
    Object.entries(appState.pockets).filter(([key]) => !exclude.includes(key)).forEach(([key, pocket]) => {
      const option = document.createElement("option"); option.value = key; option.textContent = `${pocket.name} — ${formatRupiah(pocket.balance)}`; select.appendChild(option);
    });
    wrap.appendChild(select); content.appendChild(wrap); return select;
  };
  const inputField = (id, label, placeholder, type = "text") => {
    const wrap = document.createElement("label"); wrap.className = "block text-xs font-medium text-slate-500 space-y-1";
    const title = document.createElement("span"); title.textContent = label; wrap.appendChild(title);
    const input = document.createElement("input"); input.id = id; input.type = type; input.placeholder = placeholder; input.className = fieldClass;
    if (type === "number") { input.min = "1"; input.step = "1"; }
    wrap.appendChild(input); content.appendChild(wrap); return input;
  };
  const submit = (label, callback) => {
    const button = document.createElement("button"); button.type = "button"; button.className = buttonClass; button.textContent = label;
    button.addEventListener("click", () => callback()); content.appendChild(button);
  };
  const note = text => { const p = document.createElement("p"); p.className = "text-xs text-slate-500 leading-relaxed"; p.textContent = text; content.appendChild(p); };
  const finish = message => { overlay.remove(); updateUI(); if (message) showToast(message); };

  if (type === "transfer") {
    const from = selectField("transfer-from", "Dari pocket");
    const to = selectField("transfer-to", "Ke pocket");
    if (to.options.length > 1) to.selectedIndex = 1;
    const amount = inputField("transfer-amount", "Nominal transfer (Rp)", "Contoh: 100000", "number");
    submit("Transfer Sekarang", () => {
      const value = Number(amount.value);
      if (from.value === to.value) return showToast("Pilih dua pocket yang berbeda.");
      if (!Number.isFinite(value) || value <= 0) return showToast("Nominal transfer tidak valid.");
      if (appState.pockets[from.value].balance < value) return showToast("Saldo pocket asal tidak mencukupi.");
      appState.pockets[from.value].balance -= value;
      appState.pockets[to.value].balance += value;
      addTransaction("Transfer", value, `Transfer ke ${appState.pockets[to.value].name}`, appState.pockets[from.value].name);
      finish("Transfer berhasil.");
    });
  } else if (type === "topup") {
    const to = selectField("topup-pocket", "Pocket tujuan");
    const amount = inputField("topup-amount", "Nominal top up (Rp)", "Contoh: 250000", "number");
    submit("Top Up Sekarang", () => {
      const value = Number(amount.value);
      if (!Number.isFinite(value) || value <= 0) return showToast("Nominal top up tidak valid.");
      appState.pockets[to.value].balance += value;
      addTransaction("Top Up", value, "Top up saldo pocket", appState.pockets[to.value].name);
      finish("Top up berhasil ditambahkan ke simulasi.");
    });
    note("Top Up adalah simulasi; tidak ada uang sungguhan yang dipindahkan.");
  } else if (type === "create-pocket") {
    const name = inputField("new-pocket-name", "Nama pocket", "Contoh: Tabungan Liburan");
    const limit = inputField("new-pocket-limit", "Target / limit (Rp)", "Contoh: 1000000", "number");
    const initial = inputField("new-pocket-initial", "Saldo awal (Rp)", "Boleh 0", "number");
    initial.min = "0";
    submit("Simpan Pocket", () => {
      const cleanName = name.value.trim();
      const cap = Number(limit.value);
      const balance = Number(initial.value || 0);
      if (!cleanName) return showToast("Nama pocket wajib diisi.");
      if (Object.values(appState.pockets).some(p => p.name.toLowerCase() === cleanName.toLowerCase())) return showToast("Nama pocket sudah digunakan.");
      if (!Number.isFinite(cap) || cap <= 0 || !Number.isFinite(balance) || balance < 0) return showToast("Limit atau saldo awal tidak valid.");
      const key = "pocket_" + Date.now();
      appState.pockets[key] = { name: cleanName, balance, limit: cap, icon: "wallet" };
      addTransaction("Pocket Baru", balance, `Membuat ${cleanName}`, cleanName);
      finish("Pocket baru berhasil dibuat.");
    });
  } else if (type === "manage") {
    const pocket = appState.pockets[pocketKey];
    if (!pocket) { note("Pocket tidak ditemukan."); return; }
    const balance = inputField("manage-balance", "Ubah saldo simulasi (Rp)", "Saldo baru", "number");
    balance.value = pocket.balance;
    const limit = inputField("manage-limit", "Ubah limit (Rp)", "Limit baru", "number");
    limit.value = pocket.limit;
    submit("Simpan Perubahan", () => {
      const newBalance = Number(balance.value), newLimit = Number(limit.value);
      if (!Number.isFinite(newBalance) || newBalance < 0 || !Number.isFinite(newLimit) || newLimit <= 0) return showToast("Saldo atau limit tidak valid.");
      pocket.balance = newBalance; pocket.limit = newLimit;
      addTransaction("Penyesuaian", 0, `Perbarui ${pocket.name}`, pocket.name);
      finish("Pocket berhasil diperbarui.");
    });
    if (!["bensin", "makan", "emergency"].includes(pocketKey)) {
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "w-full py-3 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50"; remove.textContent = "Hapus Pocket";
      remove.addEventListener("click", () => {
        if (pocket.balance > 0) return showToast("Pindahkan atau kosongkan saldo pocket sebelum menghapusnya.");
        if (!confirm(`Hapus pocket "${pocket.name}"?`)) return;
        delete appState.pockets[pocketKey]; finish("Pocket dihapus.");
      });
      content.appendChild(remove);
    }
  } else if (type === "more") {
    [["Transfer", "transfer"], ["Top Up", "topup"], ["Buat Pocket", "create-pocket"], ["Analisis Keuangan", "analysis"], ["Riwayat Transaksi", "history"]].forEach(([label, action]) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-sm font-semibold text-slate-700"; button.textContent = label;
      button.addEventListener("click", () => { overlay.remove(); openActionModal(action); }); content.appendChild(button);
    });
  } else if (type === "notifications") {
    if (!appState.transactions.length) note("Belum ada notifikasi. Aktivitas baru akan muncul setelah kamu mencoba transaksi simulasi.");
    else {
      note(`Ada ${appState.transactions.length} aktivitas tersimpan di Finova.`);
      appState.transactions.slice(0, 5).forEach(tx => note(`${tx.description} — ${formatRupiah(tx.amount)}`));
    }
  } else if (type === "analysis") {
    const income = appState.transactions.filter(tx => ["Top Up", "Gaji Masuk"].includes(tx.type)).reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = appState.transactions.filter(tx => ["Pembayaran"].includes(tx.type)).reduce((sum, tx) => sum + tx.amount, 0);
    const transfers = appState.transactions.filter(tx => tx.type === "Transfer").reduce((sum, tx) => sum + tx.amount, 0);
    note(`Total saldo saat ini: ${formatRupiah(getTotalBalance())}`);
    note(`Dana masuk simulasi tercatat: ${formatRupiah(income)}`);
    note(`Pembayaran tercatat: ${formatRupiah(expenses)}`);
    note(`Transfer antar pocket tercatat: ${formatRupiah(transfers)}`);
    note("Angka ini berdasarkan aktivitas simulasi yang tercatat di perangkat ini.");
  } else if (type === "profile") {
    const name = inputField("profile-name", "Nama tampilan", "Nama kamu");
    name.value = appState.profileName;
    submit("Simpan Profil", () => {
      if (!name.value.trim()) return showToast("Nama tidak boleh kosong.");
      appState.profileName = name.value.trim();
      finish("Profil berhasil diperbarui.");
    });
    const reset = document.createElement("button"); reset.type = "button"; reset.className = "w-full py-3 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50"; reset.textContent = "Reset Data Simulasi";
    reset.addEventListener("click", () => {
      if (!confirm("Reset seluruh saldo, pocket, dan riwayat simulasi di perangkat ini?")) return;
      const fresh = defaultState();
      appState.totalSalary = fresh.totalSalary; appState.pockets = fresh.pockets; appState.transactions = fresh.transactions; appState.profileName = fresh.profileName; appState.pendingTransaction = null;
      finish("Data simulasi dikembalikan ke awal.");
    });
    content.appendChild(reset);
    note("Data simulasi tersimpan di browser perangkat ini saja.");
  } else if (type === "history") {
    if (!appState.transactions.length) note("Belum ada transaksi yang tercatat.");
    appState.transactions.forEach(tx => note(`${new Date(tx.date).toLocaleString("id-ID")} • ${tx.description} • ${formatRupiah(tx.amount)}`));
  }
}

function showToast(message) {
  let toast = document.getElementById("finova-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "finova-toast";
    toast.className = "fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl max-w-[90vw] text-center";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.add("hidden"), 3200);
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    document.getElementById("finova-action-modal")?.remove();
    closePaymentModal();
    closeOverlimitModal();
  }
});
