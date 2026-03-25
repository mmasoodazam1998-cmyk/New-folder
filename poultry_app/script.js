const app = {
    data: {
        customers: [], 
        farmers: [],   
        sales: [],     
        purchases: [],
        receipts: [],
        payments: []
    },
    
    editingRecord: null,

    getToday() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dNum = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dNum}`;
    },

    init() {
        this.loadData();
        this.setupEventListeners();
        
        this.updateDashboard();
        this.populateSelects();
        
        const today = this.getToday();
        document.getElementById('cust-date').value = today;
        document.getElementById('farm-date').value = today;
        document.getElementById('rec-date').value = today;
        const quickEntryDate = document.getElementById('quick-entry-date');
        if (quickEntryDate) quickEntryDate.value = today;
        
        // Disable future dates for custom report calendar
        const rCustomDate = document.getElementById('r-custom-date');
        if(rCustomDate) rCustomDate.max = today;
        const rDetailedDate = document.getElementById('r-detailed-date');
        if(rDetailedDate) rDetailedDate.max = today;
        
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

    navigate(viewId, navElement = null, isEdit = false) {
        if (!isEdit && ['customer-view', 'farmer-view', 'recovery-view'].includes(viewId)) {
            this.editingRecord = null;
            const cb = document.getElementById('cust-submit-btn'); if(cb) cb.innerText = 'محفوظ کریں';
            const fb = document.getElementById('farm-submit-btn'); if(fb) fb.innerText = 'محفوظ کریں';
            const rb = document.getElementById('rec-submit-btn'); if(rb) rb.innerText = 'محفوظ کریں';
        }

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
        document.getElementById(viewId).classList.add('active-view');
        
        if (navElement) {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            navElement.classList.add('active');
        }

        const backBtn = document.getElementById('header-back-btn');
        const mainIcon = document.getElementById('header-main-icon');
        if (backBtn && mainIcon) {
            if (viewId === 'dashboard-view') {
                backBtn.classList.add('hidden');
                mainIcon.classList.remove('hidden');
            } else {
                backBtn.classList.remove('hidden');
                mainIcon.classList.add('hidden');
            }
        }

        if (viewId === 'dashboard-view') this.updateDashboard();
        if (viewId === 'reports-view') this.generateReports();
        if (viewId === 'lists-view') this.renderLists();
        if (viewId === 'records-view') this.renderRecords();
        if (viewId === 'detailed-ledger-view') {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('r-detailed-date').value = today;
            this.generateDetailedReport();
        }
    },

    toggleDropdown(id) {
        document.querySelectorAll('.dropdown-content').forEach(el => {
            if(el.id !== id) el.classList.add('hidden'); 
        });
        const el = document.getElementById(id);
        if(el) el.classList.toggle('hidden');
    },

    goBack() {
        this.navigate('dashboard-view');
        // Update Bottom Nav active state
        const homeNav = document.querySelector('.bottom-nav .nav-item:first-child');
        if (homeNav) {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            homeNav.classList.add('active');
        }
    },

    downloadPDF(elementId, filename) {
        const element = document.getElementById(elementId);
        if(!element) return;
        
        // Hide all buttons in the element temporarily
        const buttons = element.querySelectorAll('button');
        const originalDisplays = [];
        buttons.forEach((btn, i) => {
            originalDisplays[i] = btn.style.display;
            btn.style.display = 'none';
        });
        
        const opt = {
            margin:       0.5,
            filename:     `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(element).save().then(() => {
            buttons.forEach((btn, i) => {
                btn.style.display = originalDisplays[i];
            });
        });
    },

    downloadActiveListPDF() {
        if (document.getElementById('list-customers').classList.contains('active')) {
            this.downloadPDF('list-customers', 'Customer_List');
        } else {
            this.downloadPDF('list-farmers', 'Farmer_List');
        }
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
            const payload = {
                id: (app.editingRecord && app.editingRecord.table === 'sales') ? app.editingRecord.id : Date.now().toString(),
                date: document.getElementById('cust-date').value,
                customerId: document.getElementById('cust-select').value,
                qty: Number(custQty.value),
                rate: Number(custRate.value),
                total: Number(custTotal.value),
                paid: Number(custPaid.value),
                dues: Number(custDues.value)
            };

            if (app.editingRecord && app.editingRecord.table === 'sales') {
                const idx = this.data.sales.findIndex(x => x.id === app.editingRecord.id);
                if(idx > -1) this.data.sales[idx] = payload;
                document.getElementById('cust-submit-btn').innerText = 'محفوظ کریں';
                app.editingRecord = null;
                alert('کسٹمر کا ریکارڈ اپ ڈیٹ ہو گیا');
            } else {
                this.data.sales.push(payload);
                alert('کسٹمر کا ریکارڈ محفوظ ہو گیا');
            }

            this.saveData();
            e.target.reset();
            document.getElementById('cust-date').value = new Date().toISOString().split('T')[0];
            this.navigate('dashboard-view');
            const homeNav = document.querySelector('.bottom-nav .nav-item:first-child');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            homeNav.classList.add('active');
        });

        document.getElementById('farmer-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const payload = {
                id: (app.editingRecord && app.editingRecord.table === 'purchases') ? app.editingRecord.id : Date.now().toString(),
                date: document.getElementById('farm-date').value,
                farmerId: document.getElementById('farm-select').value,
                qty: Number(farmQty.value),
                rate: Number(farmRate.value),
                total: Number(farmTotal.value),
                paid: Number(farmPaid.value),
                dues: Number(farmDues.value)
            };

            if (app.editingRecord && app.editingRecord.table === 'purchases') {
                const idx = this.data.purchases.findIndex(x => x.id === app.editingRecord.id);
                if(idx > -1) this.data.purchases[idx] = payload;
                document.getElementById('farm-submit-btn').innerText = 'محفوظ کریں';
                app.editingRecord = null;
                alert('فارمر کا ریکارڈ اپ ڈیٹ ہو گیا');
            } else {
                this.data.purchases.push(payload);
                alert('فارمر کا ریکارڈ محفوظ ہو گیا');
            }

            this.saveData();
            e.target.reset();
            document.getElementById('farm-date').value = new Date().toISOString().split('T')[0];
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
            const table = type === 'customer' ? 'receipts' : 'payments';

            const payload = {
                id: (app.editingRecord && app.editingRecord.table === table) ? app.editingRecord.id : Date.now().toString(),
                date,
                amount
            };
            if (type === 'customer') payload.customerId = document.getElementById('rec-cust-select').value;
            else payload.farmerId = document.getElementById('rec-farm-select').value;

            if (app.editingRecord && app.editingRecord.table === table) {
                const idx = this.data[table].findIndex(x => x.id === app.editingRecord.id);
                if(idx > -1) this.data[table][idx] = payload;
                document.getElementById('rec-submit-btn').innerText = 'محفوظ کریں';
                app.editingRecord = null;
                alert('تفصیلات اپ ڈیٹ ہو گئیں');
            } else {
                this.data[table].push(payload);
                alert('تفصیلات محفوظ ہو گئیں');
            }

            this.saveData();
            e.target.reset();
            document.getElementById('rec-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('rec-type').value = 'customer';
            document.getElementById('rec-type').dispatchEvent(new Event('change'));

            this.navigate('dashboard-view');
            const homeNav = document.querySelector('.bottom-nav .nav-item:first-child');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            homeNav.classList.add('active');
        });

        // Quick Entry Submit Logic
        const quickForm = document.getElementById('quick-entry-form');
        if (quickForm) {
            quickForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const qDate = document.getElementById('quick-entry-date').value;
                if (!qDate) { alert('تاریخ منتخب کریں!'); return; }
                const custId = document.getElementById('quick-cust-select').value;
                if (!custId) { alert('کسٹمر منتخب کریں!'); return; }
                
                const bundles = Number(document.getElementById('quick-bundles').value) || 0;
                const rate = Number(document.getElementById('quick-rate').value) || 0;
                const paid = Number(document.getElementById('quick-amount').value) || 0;

                // Delete old ones for this date/customer
                this.data.sales = this.data.sales.filter(s => !(s.customerId === custId && s.date === qDate));
                if(this.data.receipts) {
                    this.data.receipts = this.data.receipts.filter(r => !(r.customerId === custId && r.date === qDate));
                }

                if (bundles > 0 || rate > 0) {
                    const total = bundles * rate;
                    this.data.sales.push({
                        id: Date.now().toString(),
                        date: qDate,
                        customerId: custId,
                        qty: bundles,
                        rate: rate,
                        total: total,
                        paid: paid,
                        dues: total - paid
                    });
                } else if (paid > 0) {
                    if (!this.data.receipts) this.data.receipts = [];
                    this.data.receipts.push({
                        id: Date.now().toString(),
                        date: qDate,
                        customerId: custId,
                        amount: paid
                    });
                }

                this.saveData();
                e.target.reset();
                document.getElementById('quick-entry-date').value = this.getToday();
                if (document.getElementById('r-detailed-date').value === qDate) {
                    this.generateDetailedReport();
                } else {
                    document.getElementById('r-detailed-date').value = qDate;
                    this.generateDetailedReport();
                }
                alert('فوری اندراج محفوظ ہو گیا!');
            });
        }

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

        const dailyRateInput = document.getElementById('r-daily-rate-input');
        if(dailyRateInput) {
            dailyRateInput.addEventListener('input', (e) => {
                const selectedDate = document.getElementById('r-detailed-date').value;
                if(selectedDate) {
                    localStorage.setItem('poultry_daily_rate_' + selectedDate, e.target.value);
                }
            });
        }
    },

    updateDashboard() {
        // Find Local Today
        const today = this.getToday();
        
        // Bundle Calculations
        const pastPurchases = this.data.purchases.filter(p => p.date < today).reduce((sum, p) => sum + p.qty, 0);
        const pastSales = this.data.sales.filter(s => s.date < today).reduce((sum, s) => sum + s.qty, 0);
        const bundlePrev = pastPurchases - pastSales;

        const todayPurchases = this.data.purchases.filter(p => p.date === today).reduce((sum, p) => sum + p.qty, 0);
        const bundleTotal = bundlePrev + todayPurchases;
        
        const todaySales = this.data.sales.filter(s => s.date === today).reduce((sum, s) => sum + s.qty, 0);
        const bundleBal = bundleTotal - todaySales;

        // Cash Inflow
        const pastSalesPaid = this.data.sales.filter(s => s.date < today).reduce((sum, s) => sum + s.paid, 0);
        const pastReceipts = (this.data.receipts || []).filter(r => r.date < today).reduce((sum, r) => sum + r.amount, 0);
        const cashInPrev = pastSalesPaid + pastReceipts;

        const todaySalesPaid = this.data.sales.filter(s => s.date === today).reduce((sum, s) => sum + s.paid, 0);
        const todayReceipts = (this.data.receipts || []).filter(r => r.date === today).reduce((sum, r) => sum + r.amount, 0);
        const cashIn = todaySalesPaid + todayReceipts;

        // Cash Outflow
        const pastPurchasesPaid = this.data.purchases.filter(p => p.date < today).reduce((sum, p) => sum + p.paid, 0);
        const pastPayments = (this.data.payments || []).filter(p => p.date < today).reduce((sum, p) => sum + p.amount, 0);
        const cashOutPrev = pastPurchasesPaid + pastPayments;

        const todayPurchasesPaid = this.data.purchases.filter(p => p.date === today).reduce((sum, p) => sum + p.paid, 0);
        const todayPayments = (this.data.payments || []).filter(p => p.date === today).reduce((sum, p) => sum + p.amount, 0);
        const cashOutToday = todayPurchasesPaid + todayPayments;

        // Net Balances
        const cashPrev = cashInPrev - cashOutPrev;
        const cashTotal = cashPrev + cashIn;

        // UI Updates
        const elBundlePrev = document.getElementById('dash-bundle-prev');
        if (elBundlePrev) {
            
            // Set values from DB
            document.getElementById('dash-bundle-prev').value = bundlePrev;
            document.getElementById('dash-bundle-in').value = todayPurchases;
            document.getElementById('dash-bundle-total').value = bundleTotal;
            document.getElementById('dash-bundle-out').value = todaySales;
            document.getElementById('dash-bundle-bal').value = bundleBal;

            document.getElementById('dash-cash-prev').value = cashPrev;
            document.getElementById('dash-cash-in').value = cashIn;
            document.getElementById('dash-cash-total').value = cashTotal;
            
            // For Paid (Cash), we populate from DB (Today's Outgoing Payments)
            const paidInput = document.getElementById('dash-cash-paid');
            paidInput.value = cashOutToday;
            
            const balEl = document.getElementById('dash-cash-bal');

            // Dynamic Math Re-calculation Functions
            const calcCashBal = () => {
                const ct = Number(document.getElementById('dash-cash-total').value) || 0;
                const cp = Number(paidInput.value) || 0;
                balEl.value = ct - cp;
            };

            const calcBundleBal = () => {
                const p = Number(document.getElementById('dash-bundle-prev').value) || 0;
                const i = Number(document.getElementById('dash-bundle-in').value) || 0;
                const total = p + i;
                document.getElementById('dash-bundle-total').value = total;
                const o = Number(document.getElementById('dash-bundle-out').value) || 0;
                document.getElementById('dash-bundle-bal').value = total - o;
            };

            // Initial calc
            calcCashBal();

            // Attach listeners to make fields dynamic calculators
            document.getElementById('dash-bundle-prev').addEventListener('input', calcBundleBal);
            document.getElementById('dash-bundle-in').addEventListener('input', calcBundleBal);
            document.getElementById('dash-bundle-out').addEventListener('input', calcBundleBal);
            document.getElementById('dash-cash-total').addEventListener('input', calcCashBal);
            paidInput.addEventListener('input', calcCashBal);
        }
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
        const quickCust = document.getElementById('quick-cust-select');
        if (quickCust) quickCust.innerHTML = custHTML;

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
                const quickCust = document.getElementById('quick-cust-select');
                if (quickCust) quickCust.value = id;
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
        const getOpeningStock = (beforeDateStr) => {
            const pastPurch = this.data.purchases.filter(p => p.date < beforeDateStr).reduce((s, x) => s + x.qty, 0);
            const pastSales = this.data.sales.filter(s => s.date < beforeDateStr).reduce((s, x) => s + x.qty, 0);
            return pastPurch - pastSales;
        };

        const getStockData = (dateOrPrefix) => {
            const purch = this.data.purchases.filter(p => p.date.startsWith(dateOrPrefix));
            const sales = this.data.sales.filter(s => s.date.startsWith(dateOrPrefix));
            const receipts = (this.data.receipts || []).filter(r => r.date.startsWith(dateOrPrefix));
            const stockIn = purch.reduce((s, x) => s + x.qty, 0);
            const stockOut = sales.reduce((s, x) => s + x.qty, 0);
            const cashIn = sales.reduce((s, x) => s + x.paid, 0) + receipts.reduce((s, x) => s + x.amount, 0);
            return { stockIn, stockOut, cashIn };
        };

        // Daily
        const dailyOpening = getOpeningStock(today);
        const dailyData = getStockData(today);
        
        document.getElementById('r-daily-opening').innerText = dailyOpening;
        document.getElementById('r-daily-stock-in').innerText = dailyData.stockIn;
        document.getElementById('r-daily-total').innerText = dailyOpening + dailyData.stockIn;
        document.getElementById('r-daily-stock-out').innerText = dailyData.stockOut;
        document.getElementById('r-daily-closing').innerText = (dailyOpening + dailyData.stockIn) - dailyData.stockOut;
        document.getElementById('r-daily-cash-in').innerText = dailyData.cashIn.toLocaleString() + ' روپے';

        // Monthly
        const currentMonth = new Date().toLocaleString('ur', { month: 'long' });
        document.getElementById('r-month-name').innerText = currentMonth;
        
        const monthStart = monthPrefix + '-01';
        const monthlyOpening = getOpeningStock(monthStart);
        const monthlyData = getStockData(monthPrefix);
        
        document.getElementById('r-month-opening').innerText = monthlyOpening;
        document.getElementById('r-month-stock-in').innerText = monthlyData.stockIn;
        document.getElementById('r-month-total').innerText = monthlyOpening + monthlyData.stockIn;
        document.getElementById('r-month-stock-out').innerText = monthlyData.stockOut;
        document.getElementById('r-month-closing').innerText = (monthlyOpening + monthlyData.stockIn) - monthlyData.stockOut;
        document.getElementById('r-month-cash-in').innerText = monthlyData.cashIn.toLocaleString() + ' روپے';

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

    generateCustomReport() {
        const selectedDate = document.getElementById('r-custom-date').value;
        if(!selectedDate) return;

        document.getElementById('r-custom-results').classList.remove('hidden');
        
        // Format title nicely (Optional: e.g. 2024-03-24)
        document.getElementById('r-custom-title').innerText = 'رپورٹ برائے: ' + selectedDate;

        const getOpeningStock = (beforeDateStr) => {
            const pastPurch = this.data.purchases.filter(p => p.date < beforeDateStr).reduce((s, x) => s + x.qty, 0);
            const pastSales = this.data.sales.filter(s => s.date < beforeDateStr).reduce((s, x) => s + x.qty, 0);
            return pastPurch - pastSales;
        };

        const purch = this.data.purchases.filter(p => p.date === selectedDate);
        const sales = this.data.sales.filter(s => s.date === selectedDate);
        const receipts = (this.data.receipts || []).filter(r => r.date === selectedDate);
        
        const stockIn = purch.reduce((s, x) => s + x.qty, 0);
        const stockOut = sales.reduce((s, x) => s + x.qty, 0);
        const cashIn = sales.reduce((s, x) => s + x.paid, 0) + receipts.reduce((s, x) => s + x.amount, 0);
        const opening = getOpeningStock(selectedDate);

        document.getElementById('r-custom-opening').innerText = opening;
        document.getElementById('r-custom-stock-in').innerText = stockIn;
        document.getElementById('r-custom-total').innerText = opening + stockIn;
        document.getElementById('r-custom-stock-out').innerText = stockOut;
        document.getElementById('r-custom-closing').innerText = (opening + stockIn) - stockOut;
        document.getElementById('r-custom-cash-in').innerText = cashIn.toLocaleString() + ' روپے';
    },

    generateDetailedReport() {
        const selectedDate = document.getElementById('r-detailed-date').value;
        if(!selectedDate) return;

        const savedRate = localStorage.getItem('poultry_daily_rate_' + selectedDate);
        const rateInput = document.getElementById('r-daily-rate-input');
        if(rateInput) rateInput.value = savedRate || '';

        document.getElementById('r-detailed-results').classList.remove('hidden');
        
        const daySales = this.data.sales.filter(s => s.date === selectedDate);
        const dayReceipts = (this.data.receipts || []).filter(r => r.date === selectedDate);

        // Map by customer ID
        const customerMap = {};
        
        daySales.forEach(s => {
            if(!customerMap[s.customerId]) customerMap[s.customerId] = { bundles: 0, billAmt: 0, received: 0 };
            customerMap[s.customerId].bundles += s.qty;
            customerMap[s.customerId].billAmt += s.total;
            customerMap[s.customerId].received += s.paid;
        });

        dayReceipts.forEach(r => {
            if(!customerMap[r.customerId]) customerMap[r.customerId] = { bundles: 0, billAmt: 0, received: 0 };
            customerMap[r.customerId].received += r.amount;
        });

        const tbody = document.getElementById('r-detailed-tbody');
        const tfoot = document.getElementById('r-detailed-tfoot');
        tbody.innerHTML = '';
        tfoot.innerHTML = '';
        
        const customerIds = Object.keys(customerMap);
        if(customerIds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-secondary);">اس تاریخ میں کسی کسٹمر کا کوئی ریکارڈ نہیں۔</td></tr>';
            return;
        }

        const getCustomerDuesAsOf = (cId, limitDate) => {
            const totalSales = this.data.sales.filter(s => s.customerId === cId && s.date <= limitDate).reduce((s, x) => s + (x.total - x.paid), 0);
            const totalRec = (this.data.receipts || []).filter(r => r.customerId === cId && r.date <= limitDate).reduce((s, x) => s + x.amount, 0);
            return totalSales - totalRec;
        };

        let html = '';
        let totBundles = 0;
        let totBill = 0;
        let totRec = 0;

        customerIds.forEach(id => {
            const cObj = this.data.customers.find(c => c.id === id);
            const name = cObj ? cObj.name : 'نامعلوم';
            const data = customerMap[id];
            
            totBundles += data.bundles;
            totBill += data.billAmt;
            totRec += data.received;
            
            const bal = getCustomerDuesAsOf(id, selectedDate);

            html += `
                <tr>
                    <td style="padding:10px; border-bottom:1px solid #eee; font-weight:bold;">${name}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${data.bundles > 0 ? data.bundles : '-'}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee; color:var(--danger);">${data.billAmt > 0 ? data.billAmt.toLocaleString() : '-'}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee; color:var(--success);">${data.received > 0 ? data.received.toLocaleString() : '-'}</td>
                    <td style="padding:10px; border-bottom:1px solid #eee; font-weight:bold; color:${bal > 0 ? 'var(--danger)' : 'var(--text-main)'};">${bal.toLocaleString()}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        
        tfoot.innerHTML = `
            <tr>
                <td style="padding:10px; border-top:2px solid #ddd;">کل:</td>
                <td style="padding:10px; border-top:2px solid #ddd; text-align:center;">${totBundles}</td>
                <td style="padding:10px; border-top:2px solid #ddd; color:var(--danger);">${totBill.toLocaleString()}</td>
                <td colspan="2" style="padding:10px; border-top:2px solid #ddd; color:var(--success);">${totRec.toLocaleString()}</td>
            </tr>
        `;
    },

    renderLists() {
        const custList = document.getElementById('customers-list-render');
        const farmList = document.getElementById('farmers-list-render');
        
        const custDues = this.getCustomerDues();
        const farmDues = this.getFarmerDues();
        const monthPrefix = new Date().toISOString().substring(0, 7);
        
        custList.innerHTML = this.data.customers.map(c => {
            let allTx = [];
            this.data.sales.forEach(s => {
                if(s.customerId === c.id) allTx.push({ type: 'sale', date: s.date, id: s.id, qty: s.qty, total: s.total, paid: s.paid });
            });
            (this.data.receipts || []).forEach(r => {
                if(r.customerId === c.id) allTx.push({ type: 'receipt', date: r.date, id: r.id, qty: '-', total: '-', paid: r.amount });
            });

            // Sort chronologically (oldest first)
            allTx.sort((a,b) => {
                if(a.date !== b.date) return a.date.localeCompare(b.date);
                return a.id.localeCompare(b.id);
            });

            let balance = 0;
            let rowsHtml = '';
            
            allTx.forEach(tx => {
                const dateArr = tx.date.split('-');
                const fDate = `${dateArr[2]}-${dateArr[1]}-${dateArr[0].substring(2)}`; // DD-MM-YY
                
                if(tx.type === 'sale') {
                    balance = balance + tx.total - tx.paid;
                    rowsHtml += `
                        <tr>
                            <td style="white-space:nowrap;">${fDate}</td>
                            <td>${tx.qty}</td>
                            <td class="text-danger">${tx.total.toLocaleString()}</td>
                            <td class="text-success">${tx.paid.toLocaleString()}</td>
                            <td style="font-weight:bold; text-align:left;">${balance.toLocaleString()}</td>
                        </tr>
                    `;
                } else {
                    balance = balance - tx.paid;
                    rowsHtml += `
                        <tr>
                            <td style="white-space:nowrap;">${fDate}</td>
                            <td>-</td>
                            <td class="text-danger">-</td>
                            <td class="text-success">${tx.paid.toLocaleString()}</td>
                            <td style="font-weight:bold; text-align:left;">${balance.toLocaleString()}</td>
                        </tr>
                    `;
                }
            });

            if (allTx.length === 0) {
                rowsHtml = `<tr><td colspan="5" style="text-align:center; padding:10px; color:#666;">کوئی ریکارڈ نہیں</td></tr>`;
            }

            return `
            <div class="list-item" style="display:flex; flex-direction:column; gap:8px;">
                <div class="list-item-info" style="border-bottom:1px solid #ddd; padding-bottom:5px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:1.1rem; color:var(--primary);">${c.name}</strong>
                    <div class="dropdown">
                        <button class="btn-icon" onclick="app.toggleDropdown('cust-menu-${c.id}')"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                        <div id="cust-menu-${c.id}" class="dropdown-content hidden">
                            <a href="#" onclick="app.deleteCustomer('${c.id}'); return false;" class="text-danger"><i class="fa-solid fa-trash"></i> کسٹمر ڈیلیٹ کریں</a>
                        </div>
                    </div>
                </div>
                <div style="overflow-x:auto;">
                    <table class="ledger-table">
                        <thead>
                            <tr>
                                <th>تاریخ</th>
                                <th>بنڈل</th>
                                <th>رقم</th>
                                <th>جمع رقم</th>
                                <th>بقایا رقم</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>`;
        }).join('') || '<p style="text-align:center;">کوئی کسٹمر موجود نہیں</p>';

        farmList.innerHTML = this.data.farmers.map(f => {
            let allTx = [];
            this.data.purchases.forEach(p => {
                if(p.farmerId === f.id) allTx.push({ type: 'purchase', date: p.date, id: p.id, qty: p.qty, total: p.total, paid: p.paid });
            });
            (this.data.payments || []).forEach(p => {
                if(p.farmerId === f.id) allTx.push({ type: 'payment', date: p.date, id: p.id, qty: '-', total: '-', paid: p.amount });
            });

            // Sort chronologically (oldest first)
            allTx.sort((a,b) => {
                if(a.date !== b.date) return a.date.localeCompare(b.date);
                return a.id.localeCompare(b.id);
            });

            let balance = 0;
            let rowsHtml = '';
            
            allTx.forEach(tx => {
                const dateArr = tx.date.split('-');
                const fDate = `${dateArr[2]}-${dateArr[1]}-${dateArr[0].substring(2)}`; // DD-MM-YY
                
                if(tx.type === 'purchase') {
                    balance = balance + tx.total - tx.paid;
                    rowsHtml += `
                        <tr>
                            <td style="white-space:nowrap;">${fDate}</td>
                            <td>${tx.qty}</td>
                            <td class="text-danger">${tx.total.toLocaleString()}</td>
                            <td class="text-success">${tx.paid.toLocaleString()}</td>
                            <td style="font-weight:bold; text-align:left;">${balance.toLocaleString()}</td>
                        </tr>
                    `;
                } else {
                    balance = balance - tx.paid;
                    rowsHtml += `
                        <tr>
                            <td style="white-space:nowrap;">${fDate}</td>
                            <td>-</td>
                            <td class="text-danger">-</td>
                            <td class="text-success">${tx.paid.toLocaleString()}</td>
                            <td style="font-weight:bold; text-align:left;">${balance.toLocaleString()}</td>
                        </tr>
                    `;
                }
            });

            if (allTx.length === 0) {
                rowsHtml = `<tr><td colspan="5" style="text-align:center; padding:10px; color:#666;">کوئی ریکارڈ نہیں</td></tr>`;
            }

            return `
            <div class="list-item" style="display:flex; flex-direction:column; gap:8px;">
                <div class="list-item-info" style="border-bottom:1px solid #ddd; padding-bottom:5px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:1.1rem; color:var(--primary);">${f.name}</strong>
                    <div class="dropdown">
                        <button class="btn-icon" onclick="app.toggleDropdown('farm-menu-${f.id}')"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                        <div id="farm-menu-${f.id}" class="dropdown-content hidden">
                            <a href="#" onclick="app.deleteFarmer('${f.id}'); return false;" class="text-danger"><i class="fa-solid fa-trash"></i> فارمر ڈیلیٹ کریں</a>
                        </div>
                    </div>
                </div>
                <div style="overflow-x:auto;">
                    <table class="ledger-table">
                        <thead>
                            <tr>
                                <th>تاریخ</th>
                                <th>بنڈل</th>
                                <th>رقم</th>
                                <th>جمع رقم</th>
                                <th>بقایا رقم</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>`;
        }).join('') || '<p style="text-align:center;">کوئی فارمر موجود نہیں</p>';
    },

    renderRecords() {
        const listContainer = document.getElementById('all-records-list');
        if(!listContainer) return;
        let all = [];
        
        this.data.sales.forEach(s => {
            const c = this.data.customers.find(cx => cx.id === s.customerId);
            all.push({ type: 'sale', id: s.id, date: s.date, name: c ? c.name : 'نامعلوم', desc: `فروخت: ${s.qty} بنڈل`, amount: s.total, table: 'sales' });
        });
        this.data.purchases.forEach(p => {
            const f = this.data.farmers.find(fx => fx.id === p.farmerId);
            all.push({ type: 'purchase', id: p.id, date: p.date, name: f ? f.name : 'نامعلوم', desc: `خریداری: ${p.qty} بنڈل`, amount: p.total, table: 'purchases' });
        });
        (this.data.receipts || []).forEach(r => {
            const c = this.data.customers.find(cx => cx.id === r.customerId);
            all.push({ type: 'receipt', id: r.id, date: r.date, name: c ? c.name : 'نامعلوم', desc: `وصولی`, amount: r.amount, table: 'receipts' });
        });
        (this.data.payments || []).forEach(p => {
            const f = this.data.farmers.find(fx => fx.id === p.farmerId);
            all.push({ type: 'payment', id: p.id, date: p.date, name: f ? f.name : 'نامعلوم', desc: `ادائیگی`, amount: p.amount, table: 'payments' });
        });

        all.sort((a,b) => b.id.localeCompare(a.id));
        const recent = all.slice(0, 50);

        listContainer.innerHTML = recent.map(r => `
            <div class="list-item" style="display:flex; justify-content:space-between; align-items:center;">
                <div class="list-item-info" style="flex:1;">
                    <strong>${r.name}</strong>
                    <span style="font-size:0.8rem; color:#6b7280; display:block;">${r.date} - ${r.desc}</span>
                    <span style="font-size:0.85rem; font-weight:bold; color:${r.type==='sale'||r.type==='receipt' ? 'var(--primary)' : 'var(--danger)'};">${r.amount.toLocaleString()} روپے</span>
                </div>
                <div style="display:flex; gap:5px;">
                    <button onclick="app.editRecord('${r.table}', '${r.id}')" style="background:#e0f2fe; color:#0284c7; border:none; padding:10px 12px; border-radius:8px; cursor:pointer;">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="app.deleteRecord('${r.table}', '${r.id}')" style="background:#fee2e2; color:#ef4444; border:none; padding:10px 12px; border-radius:8px; cursor:pointer;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `).join('') || '<p style="text-align:center; padding:1rem;">کوئی ریکارڈ موجود نہیں</p>';
    },

    editQuickEntry(id, cxId) {
        document.querySelectorAll('.dropdown-content').forEach(el => el.classList.add('hidden'));
        const record = this.data.sales.find(s => s.id === id && s.customerId === cxId);
        if(!record) return;
        
        this.editingRecord = record;
        document.getElementById('cust-submit-btn').innerText = 'اپ ڈیٹ کریں';
        document.getElementById('cust-date').value = record.date;
        document.getElementById('cust-select').value = record.customerId;
        document.getElementById('cust-qty').value = record.qty;
        document.getElementById('cust-rate').value = record.rate;
        document.getElementById('cust-paid').value = record.paid;
        
        // trigger math
        document.getElementById('cust-qty').dispatchEvent(new Event('input'));
        
        this.navigate('customer-view', null, true);
    },

    deleteCustomer(id) {
        document.querySelectorAll('.dropdown-content').forEach(el => el.classList.add('hidden'));
        if (confirm('کیا آپ واقعی اس کسٹمر کو ڈیلیٹ کرنا چاہتے ہیں؟ اس سے وابستہ تمام ریکارڈز بھی ڈیلیٹ ہو جائیں گے۔')) {
            this.data.customers = this.data.customers.filter(c => c.id !== id);
            this.data.sales = this.data.sales.filter(s => s.customerId !== id);
            if(this.data.receipts) this.data.receipts = this.data.receipts.filter(r => r.customerId !== id);
            this.saveData();
            alert('کسٹمر ڈیلیٹ کر دیا گیا');
        }
    },

    deleteFarmer(id) {
        document.querySelectorAll('.dropdown-content').forEach(el => el.classList.add('hidden'));
        if (confirm('کیا آپ واقعی اس فارمر کو ڈیلیٹ کرنا چاہتے ہیں؟ اس سے وابستہ تمام ریکارڈز بھی ڈیلیٹ ہو جائیں گے۔')) {
            this.data.farmers = this.data.farmers.filter(f => f.id !== id);
            this.data.purchases = this.data.purchases.filter(p => p.farmerId !== id);
            if(this.data.payments) this.data.payments = this.data.payments.filter(p => p.farmerId !== id);
            this.saveData();
            alert('فارمر ڈیلیٹ کر دیا گیا');
        }
    },

    editRecord(table, id) {
        this.editingRecord = { table, id };
        let item = this.data[table].find(x => x.id === id);
        if(!item) return;

        if (table === 'sales') {
            document.getElementById('cust-date').value = item.date;
            document.getElementById('cust-select').value = item.customerId;
            document.getElementById('cust-qty').value = item.qty;
            document.getElementById('cust-rate').value = item.rate || 0;
            document.getElementById('cust-total').value = item.total;
            document.getElementById('cust-paid').value = item.paid;
            document.getElementById('cust-dues').value = item.total - item.paid;
            document.getElementById('cust-submit-btn').innerText = 'اپ ڈیٹ کریں';
            this.navigate('customer-view', null, true);
        } else if (table === 'purchases') {
            document.getElementById('farm-date').value = item.date;
            document.getElementById('farm-select').value = item.farmerId;
            document.getElementById('farm-qty').value = item.qty;
            document.getElementById('farm-rate').value = item.rate || 0;
            document.getElementById('farm-total').value = item.total;
            document.getElementById('farm-paid').value = item.paid;
            document.getElementById('farm-dues').value = item.total - item.paid;
            document.getElementById('farm-submit-btn').innerText = 'اپ ڈیٹ کریں';
            this.navigate('farmer-view', null, true);
        } else if (table === 'receipts' || table === 'payments') {
            document.getElementById('rec-date').value = item.date;
            const recTypeSelect = document.getElementById('rec-type');
            recTypeSelect.value = table === 'receipts' ? 'customer' : 'farmer';
            recTypeSelect.dispatchEvent(new Event('change'));

            if(table === 'receipts') {
                document.getElementById('rec-cust-select').value = item.customerId;
            } else {
                document.getElementById('rec-farm-select').value = item.farmerId;
            }
            document.getElementById('rec-amount').value = item.amount;
            document.getElementById('rec-submit-btn').innerText = 'اپ ڈیٹ کریں';
            this.navigate('recovery-view', null, true);
        }
    },

    deleteRecord(table, id) {
        if(confirm('کیا آپ واقعی یہ اندراج ڈیلیٹ (Delete) کرنا چاہتے ہیں؟\\nنوٹ: یہ عمل واپس نہیں ہو سکتا!')) {
            this.data[table] = this.data[table].filter(item => item.id !== id);
            this.saveData();
            this.renderRecords();
            alert('اندراج کامیابی سے ڈیلیٹ ہو گیا۔ ڈیش بورڈ اور رپورٹس اپ ڈیٹ ہو چکی ہیں۔');
        }
    },

    editQuickEntry() {
        const custId = document.getElementById('quick-cust-select').value;
        if(!custId) { alert('پہلے کسٹمر منتخب کریں!'); return; }
        const qDate = document.getElementById('quick-entry-date').value;
        
        const mSales = this.data.sales.filter(s => s.customerId === custId && s.date === qDate);
        const mRec = (this.data.receipts || []).filter(r => r.customerId === custId && r.date === qDate);
        
        if (mSales.length === 0 && mRec.length === 0) {
            alert('اس منتخب کی گئی تاریخ میں اس کسٹمر کا کوئی ریکارڈ نہیں۔');
            return;
        }

        const totBundles = mSales.reduce((sum, s) => sum + s.qty, 0);
        const rate = mSales.length > 0 ? mSales[0].rate : 0;
        const totPaid = mSales.reduce((sum, s) => sum + s.paid, 0) + mRec.reduce((sum, r) => sum + r.amount, 0);

        document.getElementById('quick-bundles').value = totBundles || '';
        document.getElementById('quick-amount').value = totPaid || '';
        document.getElementById('quick-rate').value = rate || '';
        
        this.data.sales = this.data.sales.filter(s => !(s.customerId === custId && s.date === qDate));
        if (this.data.receipts) this.data.receipts = this.data.receipts.filter(r => !(r.customerId === custId && r.date === qDate));
        this.saveData();
        
        alert('تفصیلات فارم میں آ گئی ہیں، تبدیلی کر کے محفوظ کریں کا بٹن دبائیں۔ نیا ریکارڈ پچھلے ریکارڈ کو تبدیل کر دے گا۔');
    },

    deleteQuickEntry() {
        const custId = document.getElementById('quick-cust-select').value;
        if(!custId) { alert('پہلے کسٹمر منتخب کریں!'); return; }
        const qDate = document.getElementById('quick-entry-date').value;
        
        if(confirm(`کیا آپ واقعی اس کسٹمر کا منتخب تاریخ (${qDate}) کا ریکارڈ ڈیلیٹ کرنا چاہتے ہیں؟`)) {
            this.data.sales = this.data.sales.filter(s => !(s.customerId === custId && s.date === qDate));
            if (this.data.receipts) this.data.receipts = this.data.receipts.filter(r => !(r.customerId === custId && r.date === qDate));
            this.saveData();
            if (document.getElementById('r-detailed-date').value === qDate) {
                this.generateDetailedReport();
            }
            alert('ریکارڈ کامیابی سے ڈیلیٹ ہو گیا۔');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
