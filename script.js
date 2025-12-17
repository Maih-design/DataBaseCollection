const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwVXzkdzcceWX_w2TvZS8-FQ9j19Gi_i5SHk0k4hdJOzHhdjBaDozRsnCq8CQjhconDww/exec';
let sourceData = [];
let isUpdate = false;

// 1. تحميل البيانات الأولية (الفروع والمراكز)
window.onload = async () => {
    try {
        const resp = await fetch(`${SCRIPT_URL}?action=get_source`);
        sourceData = await resp.json();
        populateBranches();
    } catch (e) {
        alert("خطأ في الاتصال بالسيرفر");
    }
};

function populateBranches() {
    const branches = [...new Set(sourceData.map(d => d.branch))];
    const bSelect = document.getElementById('branchSelect');
    bSelect.innerHTML = '<option value="">اختر الفرع...</option>';
    branches.forEach(b => bSelect.innerHTML += `<option value="${b}">${b}</option>`);
}

function updateCentres() {
    const branch = document.getElementById('branchSelect').value;
    const cSelect = document.getElementById('centreSelect');
    cSelect.innerHTML = '<option value="">اختر المركز...</option>';
    sourceData.filter(d => d.branch === branch).forEach(c => {
        cSelect.innerHTML += `<option value="${c.centre}">${c.centre}</option>`;
    });
}

// 2. التحقق من الخطوة الأولى
async function validateStep1() {
    const branch = document.getElementById('branchSelect').value;
    const centre = document.getElementById('centreSelect').value;
    
    if (!branch || !centre) {
        alert("من فضلك اختر الفرع والمركز أولاً");
        return;
    }

    const resp = await fetch(`${SCRIPT_URL}?action=check_centre&centre=${centre}`);
    const result = await resp.json();
    
    if (result.exists) {
        if (confirm(`تم إدخال بيانات "${centre}" مسبقاً. هل تود التعديل؟`)) {
            isUpdate = true;
        } else { return; }
    }
    
    document.getElementById('displayInfo').innerText = `الفرع: ${branch} | المركز: ${centre}`;
    changeStep(2);
}

// 3. إضافة حقول مدخل بيانات ديناميكياً
function addDataEntryRow() {
    const container = document.getElementById('dataEntryContainer');
    const div = document.createElement('div');
    div.className = 'employee-group mb-3 position-relative';
    div.setAttribute('data-role', 'مدخل بيانات');
    div.innerHTML = `
        <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2" onclick="this.parentElement.remove()">×</button>
        <h6>مدخل بيانات إضافي</h6>
        <div class="row g-2">
            <div class="col-md-4"><input type="text" class="form-control emp-name" placeholder="الاسم الرباعي" required></div>
            <div class="col-md-4"><input type="number" class="form-control emp-id" placeholder="الرقم القومي" required></div>
            <div class="col-md-4"><input type="number" class="form-control emp-phone" placeholder="رقم التليفون" required></div>
        </div>`;
    container.appendChild(div);
}

// 4. المراجعة والإرسال
function showReview() {
    const emps = getEmployeeData();
    let html = `<table class="table table-striped">
                <thead><tr><th>الوظيفة</th><th>الاسم</th><th>الرقم القومي</th></tr></thead><tbody>`;
    emps.forEach(e => {
        html += `<tr><td>${e.role}</td><td>${e.name}</td><td>${e.nationalID}</td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('reviewTable').innerHTML = html;
    changeStep(3);
}

function getEmployeeData() {
    const groups = document.querySelectorAll('.employee-group');
    let data = [];
    groups.forEach(g => {
        data.push({
            role: g.getAttribute('data-role'),
            name: g.querySelector('.emp-name').value,
            nationalID: g.querySelector('.emp-id').value,
            phone: g.querySelector('.emp-phone') ? g.querySelector('.emp-phone').value : '-'
        });
    });
    return data;
}

async function finalSubmit() {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerText = 'جاري الحفظ...';

    const payload = {
        action: isUpdate ? 'update' : 'submit',
        branch: document.getElementById('branchSelect').value,
        centre: document.getElementById('centreSelect').value,
        employees: getEmployeeData()
    };

    try {
        const resp = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await resp.json();
        alert(res.message);
        if (res.status === 'success') location.reload();
    } catch (e) {
        alert("حدث خطأ أثناء الإرسال");
        btn.disabled = false;
    }
}

function changeStep(n) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${n}`).classList.add('active');
    window.scrollTo(0,0);
}