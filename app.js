// ==========================================================================
// App State & Data Management
// ==========================================================================
let medicines = [];

// Load data from LocalStorage
function loadData() {
    const data = localStorage.getItem('mikan-simple-meds');
    if (data) {
        try {
            medicines = JSON.parse(data);
            // Migrating older data if dosage exists
            medicines = medicines.map(m => {
                if (m.dosage && m.dosage !== 1) {
                    m.frequency = m.dosage * m.frequency;
                    m.dosage = 1;
                }
                return m;
            });
        } catch (e) {
            console.error('データの読み込みに失敗しました。', e);
            medicines = [];
        }
    } else {
        medicines = [];
    }
}

// Save data to LocalStorage
function saveData() {
    localStorage.setItem('mikan-simple-meds', JSON.stringify(medicines));
    render();
}

// ==========================================================================
// Initialization & Event Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTheme();
    initFormToggle();
    initForms();
    initBackupRestore();
    
    // Set default date in form to today
    const dateInput = document.getElementById('med-base-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }
    
    // Initial Render
    render();
    lucide.createIcons();
});

// ==========================================================================
// Theme Management (Light / Dark Mode)
// ==========================================================================
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('mikan-theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('mikan-theme', newTheme);
        showToast(newTheme === 'dark' ? 'ダークモードにしました' : 'ライトモードにしました');
    });
}

// ==========================================================================
// Form Open/Close Logic
// ==========================================================================
function initFormToggle() {
    const toggleBtn = document.getElementById('toggle-form-btn');
    const formSection = document.getElementById('form-section');
    const cancelBtn = document.getElementById('cancel-form-btn');
    
    toggleBtn.addEventListener('click', () => {
        formSection.classList.toggle('open');
        if (formSection.classList.contains('open')) {
            document.getElementById('med-name').focus();
            toggleBtn.style.display = 'none';
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        closeFormSection();
    });
}

function closeFormSection() {
    const formSection = document.getElementById('form-section');
    const toggleBtn = document.getElementById('toggle-form-btn');
    formSection.classList.remove('open');
    setTimeout(() => {
        resetForm();
        toggleBtn.style.display = 'inline-flex';
    }, 300);
}

// ==========================================================================
// CRUD / Logic Functions
// ==========================================================================
function initForms() {
    const form = document.getElementById('medicine-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('med-id').value;
        const name = document.getElementById('med-name').value.trim();
        const baseDate = document.getElementById('med-base-date').value;
        const stock = parseFloat(document.getElementById('med-stock').value);
        const dailyAmount = parseFloat(document.getElementById('med-daily-amount').value);
        
        if (id) {
            // Edit
            const index = medicines.findIndex(m => m.id === id);
            if (index !== -1) {
                medicines[index] = { id, name, baseDate, stock, dosage: 1, frequency: dailyAmount };
                showToast('お薬情報を更新しました');
            }
        } else {
            // Add
            const newMed = {
                id: Date.now().toString(),
                name,
                baseDate,
                stock,
                dosage: 1,
                frequency: dailyAmount
            };
            medicines.push(newMed);
            showToast('お薬を登録しました');
        }
        
        saveData();
        closeFormSection();
    });
}

function resetForm() {
    document.getElementById('medicine-form').reset();
    document.getElementById('med-id').value = '';
    document.getElementById('form-title').textContent = '新しいお薬の入力';
    document.getElementById('med-base-date').value = new Date().toISOString().slice(0, 10);
}

function editMedicine(id) {
    const med = medicines.find(m => m.id === id);
    if (!med) return;
    
    document.getElementById('med-id').value = med.id;
    document.getElementById('med-name').value = med.name;
    document.getElementById('med-base-date').value = med.baseDate;
    document.getElementById('med-stock').value = med.stock;
    document.getElementById('med-daily-amount').value = med.frequency; // mapping frequency to dailyAmount
    
    document.getElementById('form-title').textContent = 'お薬情報の編集';
    
    // Open Form
    const formSection = document.getElementById('form-section');
    const toggleBtn = document.getElementById('toggle-form-btn');
    formSection.classList.add('open');
    toggleBtn.style.display = 'none';
    
    document.querySelector('.app-main').scrollTop = 0;
}

function deleteMedicine(id) {
    if (confirm('このお薬を削除してもよろしいですか？')) {
        medicines = medicines.filter(m => m.id !== id);
        saveData();
        showToast('お薬を削除しました');
    }
}

// Adjust stock by absolute count (1 unit) from table
function adjustStockCount(id, amount) {
    const med = medicines.find(m => m.id === id);
    if (!med) return;
    
    med.stock = Math.max(0, parseFloat((med.stock + amount).toFixed(2)));
    saveData();
}

// Reset base date to today and update stock based on elapsed days
function setBaseDateToToday(id) {
    const med = medicines.find(m => m.id === id);
    if (!med) return;
    
    const dailyNeed = med.frequency; // dailyAmount
    
    const base = new Date(med.baseDate);
    const today = new Date();
    base.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    const diffTime = today - base;
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    if (diffDays === 0) {
        showToast('基準日はすでに本日です');
        return;
    }
    
    const consumed = diffDays * dailyNeed;
    const newStock = Math.max(0, parseFloat((med.stock - consumed).toFixed(2)));
    
    if (confirm(`基準日を今日にし、経過日数 (${diffDays}日分) のお薬を減らしますか？\n新個数: ${newStock}個`)) {
        med.baseDate = today.toISOString().slice(0, 10);
        med.stock = newStock;
        saveData();
        showToast('基準日を本日に更新しました');
    }
}

// ==========================================================================
// Sorting Functions (Manual Re-ordering)
// ==========================================================================
function moveUp(index) {
    if (index <= 0) return;
    const temp = medicines[index];
    medicines[index] = medicines[index - 1];
    medicines[index - 1] = temp;
    saveData();
}

function moveDown(index) {
    if (index >= medicines.length - 1) return;
    const temp = medicines[index];
    medicines[index] = medicines[index + 1];
    medicines[index + 1] = temp;
    saveData();
}

// ==========================================================================
// Expiry Calculator Core Logic
// ==========================================================================
function calculateExpiry(med) {
    const dailyConsumption = med.frequency; // frequency behaves as dailyAmount directly
    if (dailyConsumption <= 0) {
        return { remainingDays: 0, expiryDate: new Date(med.baseDate), formattedDate: '計算不可' };
    }
    
    const remainingDays = Math.floor(med.stock / dailyConsumption);
    const base = new Date(med.baseDate);
    const expiry = new Date(base);
    
    if (remainingDays > 0) {
        expiry.setDate(base.getDate() + remainingDays - 1);
    } else {
        expiry.setDate(base.getDate() - 1);
    }
    
    const options = { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' };
    const formattedDate = remainingDays > 0 ? expiry.toLocaleDateString('ja-JP', options) : '在庫切れ';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryZeroTime = new Date(expiry);
    expiryZeroTime.setHours(0,0,0,0);
    
    const timeDiff = expiryZeroTime - today;
    const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    
    const isDanger = remainingDays === 0 || daysUntilExpiry <= 3;
    
    return {
        remainingDays,
        expiryDate: expiry,
        formattedDate,
        isDanger,
        daysUntilExpiry: remainingDays > 0 ? daysUntilExpiry : 0
    };
}

// ==========================================================================
// Rendering (Excel-like Table Rows)
// ==========================================================================
function render() {
    const listBody = document.getElementById('medicine-list-body');
    const emptyState = document.getElementById('empty-state');
    const table = document.querySelector('.medicine-table');
    
    if (!listBody) return;
    
    listBody.innerHTML = '';
    
    if (medicines.length === 0) {
        if (table) table.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    if (table) table.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';
    
    // Maintain user-defined order (no date sorting)
    medicines.forEach((med, index) => {
        const info = calculateExpiry(med);
        const tr = document.createElement('tr');
        if (info.isDanger) {
            tr.className = 'danger-row';
        }
        
        const isOut = info.remainingDays <= 0;
        
        tr.innerHTML = `
            <td class="td-order text-center">
                <div class="sort-buttons">
                    <button class="sort-btn" onclick="moveUp(${index})" ${index === 0 ? 'disabled' : ''} title="上へ">▲</button>
                    <button class="sort-btn" onclick="moveDown(${index})" ${index === medicines.length - 1 ? 'disabled' : ''} title="下へ">▼</button>
                </div>
            </td>
            <td class="td-name"><strong class="med-table-name">${escapeHtml(med.name)}</strong></td>
            <td class="td-date"><span class="med-table-date">${med.baseDate}</span></td>
            <td class="td-stock text-right"><span class="med-table-stock">${med.stock}</span><span class="unit-text">個</span></td>
            <td class="td-daily text-right"><span class="med-table-daily">${med.frequency}個</span></td>
            <td class="td-expiry">
                <div class="expiry-cell">
                    <span class="med-table-expiry">${info.formattedDate}</span>
                    <span class="med-table-days ${info.isDanger ? 'warn' : 'ok'}">${isOut ? '要補充' : `あと ${info.remainingDays}日`}</span>
                </div>
            </td>
            <td class="td-controls text-center">
                <div class="table-controls">
                    <button class="med-btn-count btn-xs" onclick="adjustStockCount('${med.id}', -1)" title="1個減らす">-1個</button>
                    <button class="med-btn-count btn-xs" onclick="adjustStockCount('${med.id}', 1)" title="1個増やす">+1個</button>
                    <button class="med-btn-count btn-xs" onclick="setBaseDateToToday('${med.id}')" title="基準日を今日にする">今日に</button>
                </div>
            </td>
            <td class="td-actions text-center">
                <div class="table-actions">
                    <button class="icon-btn btn-xs-icon" onclick="editMedicine('${med.id}')" title="編集">
                        <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="icon-btn btn-xs-icon" onclick="deleteMedicine('${med.id}')" title="削除" style="color: var(--danger)">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </td>
        `;
        listBody.appendChild(tr);
    });
    
    // Refresh icons
    lucide.createIcons();
}

// ==========================================================================
// Backup & Restore
// ==========================================================================
function initBackupRestore() {
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    const clearAllBtn = document.getElementById('clear-all-btn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (medicines.length === 0) {
                showToast('データがありません');
                return;
            }
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(medicines, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `mikan-simple-medicine-backup-${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast('エクスポートしました');
        });
    }
    
    if (importFile) {
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const imported = JSON.parse(evt.target.result);
                    if (Array.isArray(imported)) {
                        medicines = imported;
                        // migrate just in case
                        medicines = medicines.map(m => {
                            if (m.dosage && m.dosage !== 1) {
                                m.frequency = m.dosage * m.frequency;
                                m.dosage = 1;
                            }
                            return m;
                        });
                        saveData();
                        showToast('データを復元しました');
                    } else {
                        showToast('正しいファイルではありません');
                    }
                } catch (err) {
                    showToast('データの読み込みに失敗しました');
                }
            };
            reader.readAsText(file);
            importFile.value = '';
        });
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm('すべてのデータを消去しますか？（元に戻せません）')) {
                medicines = [];
                saveData();
                showToast('すべてのデータを消去しました');
            }
        });
    }
}

// ==========================================================================
// Utilities
// ==========================================================================
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
