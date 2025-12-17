const SCRIPT_URL = 'رابط_الـ_WEB_APP_هنا';
let sourceData = [];

// تحميل الفروع
window.onload = async () => {
    const resp = await fetch(`${SCRIPT_URL}?action=get_source`);
    sourceData = await resp.json();
    const branches = [...new Set(sourceData.map(d => d.branch))];
    const bSelect = document.getElementById('branchSelect');
    bSelect.innerHTML = '<option value="">اختر الفرع...</option>';
    branches.forEach(b => bSelect.innerHTML += `<option value="${b}">${b}</option>`);
};

function updateCentres() {
    const branch = document.getElementById('branchSelect').value;
    const cSelect = document.getElementById('centreSelect');
    cSelect.innerHTML = '<option value="">اختر المركز...</option>';
    sourceData.filter(d => d.branch === branch).forEach(c => {
        cSelect.innerHTML += `<option value="${c.centre}">${c.centre}</option>`;
    });
}

async function validateStep1() {
    const centre = document.getElementById('centreSelect').value;
    const branch = document.getElementById('branchSelect').value;
    if(!centre) return alert("اختر المركز");

    document.getElementById('displayLocation').innerText = `${branch} - ${centre}`;

    // التحقق من وجود بيانات سابقة وملئها
    const resp = await fetch(`${SCRIPT_URL}?action=get_centre_details&centre=${centre}`);
    const result = await resp.json();

    if (result.exists) {
        if (confirm('بيانات هذا المركز مسجلة بالفعل، هل تود تحميلها لتعديلها؟')) {
            fillFormWithData(result.employees);
        }
    }
    changeStep(2);
}

function fillFormWithData(employees) {
    // تفريغ مدخلي البيانات الإضافيين أولاً
    document.getElementById('dataEntryContainer').innerHTML = '';
    
    employees.forEach(emp => {
        let group;
        if (emp.role === 'مدخل بيانات') {
            addDataEntryRow(emp);
        } else {
            group = document.querySelector(`.employee-group[data-role="${emp.role}"]`);
            if (group) {
                group.querySelector('.emp-name').value = emp.name;
                group.querySelector('.emp-id').value = emp.nationalID;
                group.querySelector('.emp-phone').value = emp.phone;
            }
        }
    });
}

function addDataEntryRow(data = null) {
    const container = document.getElementById('dataEntryContainer');
    const index = container.children.length + 1;
    const div = document.createElement('div');
    div.className = 'employee-group border rounded p-3 mb-4';
    div.setAttribute('data-role', 'مدخل بيانات');
    div.innerHTML = `
        <div class="d-flex justify-content-between">
            <h5 class="text-primary">مدخل بيانات (${index})</h5>
            ${index > 1 ? `<button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove()">حذف</button>` : ''}
        </div>
        <small class="text-danger d-block mb-2">له اسم مستخدم على المنظومة</small>
        <div class="row g-3">
            <div class="col-md-4"><input type="text" class="form-control emp-name" value="${data?data.name:''}" placeholder="الاسم الرباعي" required></div>
            <div class="col-md-4"><input type="text" class="form-control emp-id" value="${data?data.nationalID:''}" placeholder="الرقم القومي" maxlength="14" required></div>
            <div class="col-md-4"><input type="text" class="form-control emp-phone" value="${data?data.phone:''}" placeholder="رقم التليفون" required></div>
        </div>`;
    container.appendChild(div);
}

function validateAndReview() {
    const emps = getEmployeeData();
    let errors = [];

    emps.forEach(e => {
        // التحقق من الحقول الإجبارية (المدير الطبي وأول مدخل بيانات)
        if ((e.role === 'مدير طبي' || e.isFirstDataEntry) && (!e.name || !e.nationalID || !e.phone)) {
            errors.push(`بيانات ${e.role} إجبارية بالكامل.`);
        }

        // إذا تم إدخال أي بيانات في حقل اختياري، يجب إكمال الصف
        if (e.name || e.nationalID || e.phone) {
            if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(e.name)) errors.push(`الاسم في وظيفة ${e.role} يجب أن يكون حروفاً فقط.`);
            if (!/^\d{14}$/.test(e.nationalID)) errors.push(`الرقم القومي في وظيفة ${e.role} يجب أن يكون 14 رقماً.`);
            if (!/^\d+$/.test(e.phone)) errors.push(`رقم التليفون في وظيفة ${e.role} يجب أن يكون أرقاماً فقط.`);
        }
    });

    if (errors.length > 0) {
        alert(errors.join("\n"));
        return;
    }

    // عرض المراجعة
    let html = '<table class="table table-bordered bg-white"><thead><tr class="table-dark"><th>الوظيفة</th><th>الاسم</th><th>الرقم القومي</th></tr></thead><tbody>';
    emps.filter(e => e.name).forEach(e => {
        html += `<tr><td>${e.role}</td><td>${e.name}</td><td>${e.nationalID}</td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('reviewTable').innerHTML = html;
    changeStep(3);
}

function getEmployeeData() {
    const groups = document.querySelectorAll('.employee-group');
    let data = [];
    groups.forEach((g, index) => {
        data.push({
            role: g.getAttribute('data-role'),
            name: g.querySelector('.emp-name').value.trim(),
            nationalID: g.querySelector('.emp-id').value.trim(),
            phone: g.querySelector('.emp-phone').value.trim(),
            isFirstDataEntry: (g.getAttribute('data-role') === 'مدخل بيانات' && index === 4) // فهرس أول مدخل بيانات في النموذج
        });
    });
    return data;
}

async function finalSubmit() {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.innerText = 'جاري الحفظ والتحديث...';

    const payload = {
        branch: document.getElementById('branchSelect').value,
        centre: document.getElementById('centreSelect').value,
        employees: getEmployeeData().filter(e => e.name !== "")
    };

    const resp = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await resp.json();
    alert(result.message);
    if(result.status === 'success') location.reload();
}

function changeStep(n) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${n}`).classList.add('active');
    window.scrollTo(0,0);
}
