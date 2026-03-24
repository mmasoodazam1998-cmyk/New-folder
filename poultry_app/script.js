const app = {
    data: {
        customers: [], 
        farmers: [],   
        sales: [],     
        purchases: [],
        receipts: [],
        payments: []
    },
    
    init() {
        this.loadData();
        this.setupEventListeners();
        
        const storedPin = localStorage.getItem('appPin');
        if (!storedPin) {
            document.getElementById('auth-title').innerText = 'پن سیٹ کریں';
            document.getElementById('auth-desc').innerText = 'پہلی بار ایپ استعمال کے لیے نیا 4 ہندسوں کا پن (PIN) بنائیں';
        }
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('cust-date').value = today;
        document.getElementById('farm-date').value = today;
        document.getElementById('rec-date').value = today;
        
        // PWA Install logic
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            const installBtn = document.getElementById('installAppBtn');
            installBtn.classList.remove('hidden');
            installBtn.addEventListener('click', () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choice) => {
                    if (choice.outcome === 'accepted') {
                        installBtn.classList.add('hidden');
                    }
                    deferredPrompt = null;
                });
            });
        });
    },

    login() {
        const pinInput = document.getElementById('auth-pin').value;
        const storedPin = localStorage.getItem('appPin');
        const errorMsg = document.getElementById('auth-error');

        if (!storedPin) {
            if (pinInput.length >= 4) {
                localStorage.setItem('appPin', pinInput);
                this.unlockApp();
            } else {
                errorMsg.innerText = 'کم از کم 4 ہندسے درج کریں';
                errorMsg.classList.remove('hidden');
            }
        } else {
            if (pinInput === storedPin) {
                this.unlockApp();
            } else {
                errorMsg.innerText = 'غلط پن کوڈ';
                errorMsg.classList.remove('hidden');
            }
        }
    },

    unlockApp() {
        document.getElementById('auth-pin').value = '';
        document.getElementById('auth-error').classList.add('hidden');
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-wrapper').classList.remove('hidden');
        
        this.updateDashboard();
        this.populateSelects();
    },

    logout() {
        document.getElementById('app-wrapper').classList.add('hidden');
        document.getElementById('auth-title').innerText = 'ایپ ان لاک کریں';
        document.getElementById('auth-desc').innerText = 'اپنا 4 ہندسوں کا پن (PIN) درج کریں';
        document.getElementById('auth-screen').style.display = 'flex';
        this.navigate('dashboard-view');
    },

    loadData() {
        const stored = localStorage.getItem('poultryAppDB');
        if (stored) {
            const parsed = JSON.parse(stored);
            this.data = { ...this.data, ...parsed };
            this.data.receipts = this.data.receipts || [];
            this.data.payments = this.data.payments || [];
        }
    },

    saveData() {
        localStorage.setItem('poultryAppDB', JSON.stringify(this.data));
        this.updateDashboard();
        this.populateSelects();
        this.renderLists();
    },

    navigate(viewId, navElement = null) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
        document.getElementById(viewId).classList.add('active-view');
        
        if (navElement) {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            navElement.classList.add('active');
        }

        if (viewId === 'dashboard-view') this.updateDashboard();
        if (viewId === 'reports-view') this.generateReports();
        if (viewId === 'lists-view') this.renderLists();
    },

    setupEventListeners() {
        // Customer Math
        const custQty = document.getElementById('cust-qty');
        const custRate = document.getElementById('cust-rate');
        const custPaid = document.getElementById('cust-paid');
        const custTotal = document.getElementById('cust-total');
        const custDues = document.getElementById('cust-dues');

        const calcCust = () => {
            const total = (Number(custQty.value) || 0) * (Number(custRate.value) || 0);
            custTotal.value = total;
            custDues.value = total - (Number(custPaid.value) || 0);
        };
        custQty.addEventListener('input', calcCust);
        custRate.addEventListener('input', calcCust);
        custPaid.addEventListener('input', calcCust);

        // Farmer Math
        const farmQty = document.getElementById('farm-qty');
        const farmRate = document.getElementById('farm-rate');
        const farmPaid = document.getElementById('farm-paid');
        const farmTotal = document.getElementById('farm-total');
        const farmDues = document.getElementById('farm-dues');

        const calcFarm = () => {
            const total = (Number(farmQty.value) || 0) * (Number(farmRate.value) || 0);
            farmTotal.value = total;
            farmDues.value = total - (Number(farmPaid.value) || 0);
        };
        farmQty.addEventListener('input', calcFarm);
        farmRate.addEventListener('input', calcFarm);
        farmPaid.addEventListener('input', calcFarm);

        // Form Submissions
        document.getElementById('customer-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.data.sales.push({
                id: Date.now().toString(),
                date: document.getElementById('cust-date').value,
                customerId: document.getElementById('cust-select').value,
                qty: Number(custQty.value),
                rate: Number(custRate.value),
                total: Number(custTotal.value),
                paid: Number(custPaid.value),
                dues: Number(custDues.value)
            });
            this.saveData();
            e.target.reset();
            document.getElementById('cust-date').value = new Date().toISOString().split('T')[0];
            alert('کسٹمر کا ریکارڈ محفوظ ہو گیا');
            this.navigate('dashboard-view');
            const homeNav = document.querySelector('.bottom-nav .nav-item:first-child');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            homeNav.classList.add('active');
        });

        document.getElementById('farmer-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.data.purchases.push({
                id: Date.now().toString(),
                date: document.getElementById('farm-date').value,
                farmerId: document.getElementById('farm-select').value,
                qty: Number(farmQty.value),
                rate: Number(farmRate.value),
                total: Number(farmTotal.value),
                paid: Number(farmPaid.value),
                dues: Number(farmDues.value)
            });
            this.saveData();
            e.target.reset();
            document.getElementById('farm-date').value = new Date().toISOString().split('T')[0];
            alert('فارمر کا ریکارڈ محفوظ ہو گیا');
            this.navigate('dashboard-view');
            const homeNav = document.querySelector('.bottom-nav .nav-item:first-child');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            homeNav.classList.add('active');
        });

        // Recovery Submit Logic
        document.getElementById('rec-type').addEventListener('change', (e) => {
            if(e.target.value === 'customer') {
                document.getElementById('rec-customer-group').classList.remove('hidden');
                document.getElementById('rec-farmer-group').classList.add('hidden');
            } else {
                document.getElementById('rec-customer-group').classList.add('hidden');
                document.getElementById('rec-farmer-group').classList.remove('hidden');
            }
        });

        document.getElementById('recovery-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('rec-type').value;
            const amount = Number(document.getElementById('rec-amount').value);
            const date = document.getElementById('rec-date').value;

            if (type === 'customer') {
                const custId = document.getElementById('rec-cust-select').value;
                this.data.receipts.push({ id: Date.now().toString(), date, customerId: custId, amount });
                alert('وصولی محفوظ ہو گئی');
            } else {
                const farmId = document.getElementById('rec-farm-select').value;
                this.data.payments.push({ id: Date.now().toString(), date, farmerId: farmId, amount });
                alert('ادائیگی محفوظ ہو گئی');
            }
            this.saveData();
            document.getElementById('rec-amount').value = '';
            document.getElementById('rec-date').value = new Date().toISOString().split('T')[0];
            this.navigate('dashboard-view');
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-target');
                const parentNav = e.target.parentElement;
                const parentSection = e.target.closest('.view');
                
                parentNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                parentSection.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(targetId).classList.add('active');
            });
        });

        // Modal close
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('addModal').style.display = 'none';
        });
    },

    updateDashboard() {
        const today = new Date().toISOString().split('T')[0];
        
        const todaySales = this.data.sales.filter(s => s.date === today);
        const todayBundles = todaySales.reduce((sum, s) => sum + s.qty, 0);
        const todayRevenue = todaySales.reduce((sum, s) => sum + s.paid, 0);

        // Current Stock = Total Purchases - Total Sales
        const totalPurchased = this.data.purchases.reduce((sum, p) => sum + p.qty, 0);
        const totalSold = this.data.sales.reduce((sum, s) => sum + s.qty, 0);
        const currentStock = totalPurchased - totalSold;

        // Total Dues = Total pending from all customers
        const duesByCustomer = this.getCustomerDues();
        const totalDues = Object.values(duesByCustomer).reduce((sum, val) => sum + val, 0);

        const duesByFarmer = this.getFarmerDues();
        const totalPayable = Object.values(duesByFarmer).reduce((sum, val) => sum + val, 0);

        document.getElementById('dash-today-sales').innerText = todayRevenue.toLocaleString() + ' روپے';
        document.getElementById('dash-today-bundles').innerText = todayBundles + ' بنڈل';
        document.getElementById('dash-total-dues').innerText = totalDues.toLocaleString() + ' روپے';
        document.getElementById('dash-farmer-dues').innerText = totalPayable.toLocaleString() + ' روپے';
        document.getElementById('dash-current-stock').innerText = currentStock + ' بنڈل';
    },

    getCustomerDues() {
        const dues = {};
        this.data.sales.forEach(s => {
            if(!dues[s.customerId]) dues[s.customerId] = 0;
            dues[s.customerId] += s.dues;
        });
        (this.data.receipts || []).forEach(r => {
            if(!dues[r.customerId]) dues[r.customerId] = 0;
            dues[r.customerId] -= r.amount;
        });
        return dues;
    },

    getFarmerDues() {
        const dues = {};
        this.data.purchases.forEach(p => {
            if(!dues[p.farmerId]) dues[p.farmerId] = 0;
            dues[p.farmerId] += p.dues;
        });
        (this.data.payments || []).forEach(p => {
            if(!dues[p.farmerId]) dues[p.farmerId] = 0;
            dues[p.farmerId] -= p.amount;
        });
        return dues;
    },

    populateSelects() {
        const custHTML = '<option value="">-- کسٹمر منتخب کریں --</option>' + 
            this.data.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        document.getElementById('cust-select').innerHTML = custHTML;
        document.getElementById('rec-cust-select').innerHTML = custHTML;

        const farmHTML = '<option value="">-- فارمر منتخب کریں --</option>' + 
            this.data.farmers.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        document.getElementById('farm-select').innerHTML = farmHTML;
        document.getElementById('rec-farm-select').innerHTML = farmHTML;
    },

    // Modals
    showAddCustomerModal() {
        document.getElementById('modal-title').innerText = 'نیا کسٹمر';
        document.getElementById('modal-input-name').value = '';
        document.getElementById('addModal').style.display = 'flex';
        
        const saveBtn = document.getElementById('modal-save-btn');
        saveBtn.onclick = () => {
            const name = document.getElementById('modal-input-name').value.trim();
            if(name) {
                const id = Date.now().toString();
                this.data.customers.push({id, name});
                this.saveData();
                document.getElementById('addModal').style.display = 'none';
                document.getElementById('cust-select').value = id;
            }
        };
    },

    showAddFarmerModal() {
        document.getElementById('modal-title').innerText = 'نیا فارمر';
        document.getElementById('modal-input-name').value = '';
        document.getElementById('addModal').style.display = 'flex';
        
        const saveBtn = document.getElementById('modal-save-btn');
        saveBtn.onclick = () => {
            const name = document.getElementById('modal-input-name').value.trim();
            if(name) {
                const id = Date.now().toString();
                this.data.farmers.push({id, name});
                this.saveData();
                document.getElementById('addModal').style.display = 'none';
                document.getElementById('farm-select').value = id;
            }
        };
    },

    generateReports() {
        const today = new Date().toISOString().split('T')[0];
        const monthPrefix = today.substring(0, 7); // YYYY-MM
        
        // Daily
        const todaySales = this.data.sales.filter(s => s.date === today);
        const todayPurch = this.data.purchases.filter(p => p.date === today);
        
        document.getElementById('r-daily-revenue').innerText = todaySales.reduce((s,x)=>s+x.total,0).toLocaleString();
        document.getElementById('r-daily-stock-out').innerText = todaySales.reduce((s,x)=>s+x.qty,0);
        document.getElementById('r-daily-stock-in').innerText = todayPurch.reduce((s,x)=>s+x.qty,0);
        document.getElementById('r-daily-credit').innerText = todaySales.reduce((s,x)=>s+x.dues,0).toLocaleString();

        const totalStockPurchased = this.data.purchases.reduce((s,x)=>s+x.qty,0) || 1;
        const totalMoneySpent = this.data.purchases.reduce((s,x)=>s+x.total,0);
        const avgPurchPrice = totalMoneySpent / totalStockPurchased;
        const dailyProfit = todaySales.reduce((s,x)=>s+x.total,0) - (todaySales.reduce((s,x)=>s+x.qty,0) * avgPurchPrice);
        document.getElementById('r-daily-profit').innerText = Math.round(dailyProfit).toLocaleString() + ' روپے';

        // Monthly
        const currentMonth = new Date().toLocaleString('ur', { month: 'long' });
        document.getElementById('r-month-name').innerText = currentMonth;
        
        const monthSales = this.data.sales.filter(s => s.date.startsWith(monthPrefix));
        const monthPurch = this.data.purchases.filter(p => p.date.startsWith(monthPrefix));
        
        const totalSalesVal = monthSales.reduce((s,x)=>s+x.total,0);
        const totalPurchVal = monthPurch.reduce((s,x)=>s+x.total,0);
        
        document.getElementById('r-month-sales').innerText = totalSalesVal.toLocaleString();
        document.getElementById('r-month-purchases').innerText = totalPurchVal.toLocaleString();
        document.getElementById('r-month-profit').innerText = (totalSalesVal - totalPurchVal).toLocaleString() + ' روپے';

        // Dues List
        const dues = this.getCustomerDues();
        const listContainer = document.getElementById('r-dues-list');
        listContainer.innerHTML = '';
        
        let hasDues = false;
        Object.keys(dues).forEach(custId => {
            if(dues[custId] > 0) {
                hasDues = true;
                const cust = this.data.customers.find(c => c.id === custId);
                const name = cust ? cust.name : 'نامعلوم';
                listContainer.innerHTML += `
                    <div class="list-item">
                        <div class="list-item-info"><strong>${name}</strong></div>
                        <div class="list-item-amount dues">${dues[custId].toLocaleString()} روپے</div>
                    </div>
                `;
            }
        });
        
        if(!hasDues) {
            listContainer.innerHTML = '<p style="text-align:center; color:#6b7280; padding:1rem;">کوئی بقایا جات نہیں</p>';
        }

        // Payment History
        const historyContainer = document.getElementById('r-history-list');
        historyContainer.innerHTML = '';
        let allHistory = [];
        (this.data.receipts || []).forEach(r => {
            const c = this.data.customers.find(cx => cx.id === r.customerId);
            allHistory.push({ date: r.date, name: c ? c.name : 'نامعلوم', amount: r.amount, type: 'receipt', obj: r });
        });
        (this.data.payments || []).forEach(p => {
            const f = this.data.farmers.find(fx => fx.id === p.farmerId);
            allHistory.push({ date: p.date, name: f ? f.name : 'نامعلوم', amount: p.amount, type: 'payment', obj: p });
        });
        
        allHistory.sort((a,b) => b.obj.id.localeCompare(a.obj.id));
        
        historyContainer.innerHTML = allHistory.map(h => `
            <div class="list-item">
                <div class="list-item-info">
                    <strong>${h.name}</strong>
                    <span>${h.date} - ${h.type === 'receipt' ? 'کسٹمر سے وصولی' : 'فارمر کو ادائیگی'}</span>
                </div>
                <div class="list-item-amount ${h.type === 'payment' ? 'dues' : 'text-success'}">${h.amount.toLocaleString()} روپے</div>
            </div>
        `).join('') || '<p style="text-align:center; padding:1rem;">کوئی ہسٹری موجود نہیں</p>';
    },

    renderLists() {
        const custList = document.getElementById('customers-list-render');
        const farmList = document.getElementById('farmers-list-render');
        
        const custDues = this.getCustomerDues();
        
        custList.innerHTML = this.data.customers.map(c => `
            <div class="list-item">
                <div class="list-item-info"><strong>${c.name}</strong></div>
                <div class="list-item-amount ${(custDues[c.id] || 0) > 0 ? 'dues' : ''}">
                    بقایا: ${(custDues[c.id] || 0).toLocaleString()}
                </div>
            </div>
        `).join('') || '<p style="text-align:center;">کوئی کسٹمر موجود نہیں</p>';

        farmList.innerHTML = this.data.farmers.map(f => `
            <div class="list-item">
                <div class="list-item-info"><strong>${f.name}</strong></div>
            </div>
        `).join('') || '<p style="text-align:center;">کوئی فارمر موجود نہیں</p>';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
