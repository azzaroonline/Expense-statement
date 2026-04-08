// ========================================================
// إعدادات التطبيق
// ========================================================
// ضع الرابط الذي حصلت عليه من Google Apps Script هنا
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEhmmgFhyfO7aetWk4Uf97Vx5TEcmjKa3I7f29NJC3DZMqL0t-t7isOvD6Z4JPNGyb/exec';

// ========================================================
// عناصر الواجهة (DOM Elements)
// ========================================================
const form = document.getElementById('expense-form');
const amountInput = document.getElementById('amount');
const noteInput = document.getElementById('note');
const submitBtn = document.getElementById('submit-btn');
const dateTimePreview = document.getElementById('current-date-time');

// عناصر حالة الاتصال
const connectionStatus = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');

// الطابور (العمليات غير المرفوعة)
const queueContainer = document.getElementById('queue-container');
const queueList = document.getElementById('queue-list');
const queueCount = document.getElementById('queue-count');
const syncBtn = document.getElementById('sync-btn');

// التنبيهات
const toast = document.getElementById('notification-toast');
const toastIcon = document.querySelector('.toast-icon');
const toastMessage = document.querySelector('.toast-message');

// متغيرات التطبيق
let isOnline = navigator.onLine;
let expenseQueue = JSON.parse(localStorage.getItem('expenseQueue')) || [];

// ========================================================
// التهيئة وتحديث الواجهة
// ========================================================

// عرض الوقت المحدث باستمرار
function updateTimePreview() {
  const now = new Date();
  const options = { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  };
  dateTimePreview.textContent = now.toLocaleString('en-GB', options);
}

setInterval(updateTimePreview, 1000);
updateTimePreview();

// تحديث حالة الاتصال
function updateOnlineStatus(e) {
  isOnline = navigator.onLine;
  if(isOnline) {
    connectionStatus.className = 'status-indicator online';
    connectionStatus.innerHTML = '<i class="fas fa-wifi"></i> <span id="status-text">متصل</span>';
    // في حال عودة الاتصال، حاول مزامنة الطابور إذا كان فيه عناصر
    if(expenseQueue.length > 0) {
      showToast('عاد الاتصال بالإنترنت. جاري مزامنة المصاريف...', 'warning', 'fas fa-sync fa-spin');
      syncQueue();
    }
  } else {
    connectionStatus.className = 'status-indicator offline';
    connectionStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> <span id="status-text">غير متصل</span>';
    showToast('انقطع الاتصال. سيتم حفظ المصاريف محلياً.', 'warning', 'fas fa-exclamation-triangle');
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// ========================================================
// الوظائف الأساسية
// ========================================================

// إظهار رسالة (Toast)
let toastTimeout;
function showToast(message, type = 'success', iconClass = null) {
  clearTimeout(toastTimeout);
  
  toast.className = `toast ${type}`;
  toastMessage.textContent = message;
  
  let defaultIcon = 'fas fa-check-circle';
  if(type === 'error') defaultIcon = 'fas fa-times-circle';
  if(type === 'warning') defaultIcon = 'fas fa-exclamation-triangle';
  
  toastIcon.innerHTML = `<i class="${iconClass || defaultIcon}"></i>`;
  
  toast.classList.add('show');
  
  if (type !== 'warning' || (type === 'warning' && !iconClass?.includes('fa-spin'))) {
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
  }
}

function hideToast() {
    toast.classList.remove('show');
}

// عرض طابور المصاريف
function renderQueue() {
  if (expenseQueue.length === 0) {
    queueContainer.classList.add('hidden');
    return;
  }
  
  queueContainer.classList.remove('hidden');
  queueCount.textContent = expenseQueue.length;
  queueList.innerHTML = '';
  
  expenseQueue.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'queue-item';
    li.innerHTML = `
      <div class="queue-item-top">
        <span class="queue-item-amount">${item.amount} ل.س</span>
        <span class="queue-item-date">${item.timestamp}</span>
      </div>
      <div class="queue-item-note">${item.note}</div>
    `;
    queueList.appendChild(li);
  });
}

// إنشاء المصفوفة عند التحميل
renderQueue();

// إرسال البيانات للـ Google Sheet
async function sendToGoogleSheets(expenseData) {
  if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
    throw new Error('يرجى وضع رابط Google Apps Script في ملف app.js');
  }

  // سنقوم بتمرير البيانات كجزء من الرابط (Query Parameters) لتجاوز مشكلة فقدان البيانات
  // عند تشغيل التطبيق من جهازك دون خادم حقيقي
  const queryParams = new URLSearchParams({
      amount: expenseData.amount,
      note: expenseData.note,
      timestamp: expenseData.timestamp
  }).toString();

  // لا نحتاج لوضع التخفي no-cors مع طلبات الـ GET، فهي تعمل بسلاسة ممتازة
  const response = await fetch(`${GOOGLE_SCRIPT_URL}?${queryParams}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('فشل الوصول للخادم.');
  }

  const result = await response.json();
  if (result.result === 'error') {
    throw new Error(result.message);
  }
  
  return result;
}

// التعامل مع تقديم النموذج
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const amount = amountInput.value.trim();
  const note = noteInput.value.trim();
  
  if(!amount || !note) return;
  
  // تجهيز بيانات المصروف
  const now = new Date();
  const timestamp = now.toLocaleString('en-GB', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  
  const expenseData = {
    id: Date.now().toString(),
    amount: amount,
    note: note,
    timestamp: timestamp
  };

  // حالة عدم وجود انترنت: الحفظ في الطابور
  if (!isOnline) {
    expenseQueue.push(expenseData);
    localStorage.setItem('expenseQueue', JSON.stringify(expenseQueue));
    renderQueue();
    
    // تصفير الحقول
    amountInput.value = '';
    noteInput.value = '';
    
    showToast('تم الحفظ مؤقتاً! (لا يوجد إنترنت)', 'warning');
    return;
  }

  // حالة وجود انترنت: الإرسال مباشرة
  setButtonLoading(true);
  
  try {
    await sendToGoogleSheets(expenseData);
    
    // نجاح
    showToast('تم تسجيل المصروف بنجاح!', 'success');
    amountInput.value = '';
    noteInput.value = '';
    amountInput.focus();
    
  } catch (error) {
    console.error('Submission error:', error);
    // إذا فشل الإرسال رغم وجود اتصال (بسبب مشكلة خادم أو CORS أو خطأ بالرابط)
    // احفظه في الطابور كي لا يضيع.
    expenseQueue.push(expenseData);
    localStorage.setItem('expenseQueue', JSON.stringify(expenseQueue));
    renderQueue();
    
    showToast('فشل الإرسال. تم الحفظ في طابور الانتظار.', 'error');
  } finally {
    setButtonLoading(false);
  }
});

// مزامنة الطابور
syncBtn.addEventListener('click', syncQueue);

async function syncQueue() {
  if (expenseQueue.length === 0) return;
  if (!isOnline) {
    showToast('لا يوجد اتصال بالإنترنت للمزامنة.', 'error');
    return;
  }

  syncBtn.disabled = true;
  syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المزامنة...';
  
  // ننسخ الطابور ونتعامل معه
  const itemsToSync = [...expenseQueue];
  let successCount = 0;
  
  try {
    for (let i = 0; i < itemsToSync.length; i++) {
        const item = itemsToSync[i];
        
        await sendToGoogleSheets(item);
        
        // إذا نجح هذا العنصر نزيله من الطابور
        expenseQueue = expenseQueue.filter(qItem => qItem.id !== item.id);
        localStorage.setItem('expenseQueue', JSON.stringify(expenseQueue));
        renderQueue();
        successCount++;
    }
    
    if (successCount > 0) {
        showToast(`تمت مزامنة ${successCount} مصاريف بنجاح!`, 'success');
    }
    
  } catch(error) {
    console.error('Sync Error', error);
    showToast('فشلت المزامنة لبعض العناصر، حاول مجدداً.', 'error');
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> مزامنة';
    renderQueue();
    hideToast();
  }
}

// مساعدة زر التحميل
function setButtonLoading(isLoading) {
  if (isLoading) {
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
  } else {
    submitBtn.classList.remove('btn-loading');
    submitBtn.disabled = false;
  }
}
