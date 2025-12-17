const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzZjzs0GpWKX8GGjX-eapfSS-56GzYAy86Y_KmnA8KAlI3MqtBVzceb3eFCqGfRf7nqrQ/exec';
let sourceData = [];

// تحميل البيانات عند البدء
window.onload = async () => {
    try {
        const resp = await fetch(`${SCRIPT_URL}?action=get_source`);
        sourceData = await resp.json();
        const branches = [...new Set(sourceData.map(d => d.branch))];
        const bSelect = document.getElementById('branchSelect');
        bSelect.innerHTML = '<option value="">اختر الفرع...</option>';
        branches.forEach(b => bSelect.innerHTML += `<option value="${b}">${b}</option>`);
    } catch (e) { console.error(e); }
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
    if(!centre) return alert("الرجاء اختيار المركز");

    document.getElementById('displayLocation').innerText = `${branch} | ${centre}`;

    const resp = await fetch(`${SCRIPT_URL}?action=get_centre_details&centre=${encodeURIComponent(centre)}`);
    const result = await resp.json();

    document.getElementById('doctorContainer').innerHTML = '';
    document.getElementById('dataEntryContainer').innerHTML = '';

    if (result.exists) {
        if (confirm('بيانات المركز مسجلة مسبقاً. هل تود تحميلها لتعديلها؟')) {
            fillFormWithData(result.employees);
        } else {
            addDoctorRow(); // يظهر الطبيب الأول دائماً حتى لو كان اختيارياً
            addDataEntryRow(); 
        }
    } else {
        addDoctorRow(); // طبيب واحد ظاهر دائماً
        addDataEntryRow(); // مدخل بيانات إجباري
    }
    
    changeStep(2);
}

function fillFormWithData(employees) {
    employees.forEach(emp => {
        if (emp.role === 'مدخل بيانات') {
            addDataEntryRow(emp);
        } else if (emp.role === 'طبيب مراجع فني') {
            addDoctorRow(emp);
        } else {
            const group = document.querySelector(`.employee-group[data-role="${emp.role}"]`);
            if (group) {
                group.querySelector('.emp-name').value = emp.name;
                group.querySelector('.emp-id').value = emp.nationalID;
                group.querySelector('.emp-phone').value = emp.phone;
            }
        }
    });
    // ضمان وجود طبيب واحد ومدخل بيانات واحد كحد أدنى للعرض
    if (document.getElementById('doctorContainer').children.length === 0) addDoctorRow();
    if (document.getElementById('dataEntryContainer').children.length === 0) addDataEntryRow();
}

function addDoctorRow(data = null) {
    const container = document.getElementById('doctorContainer');
    const index = container.children.length + 1;
    const div = document.createElement('div');
    div.className = 'employee-group border rounded p-3 mb-4 border-info';
    div.setAttribute('data-role', 'طبيب مراجع فني');
    div.innerHTML = `
        <div class="d-flex justify-content-between">
            <h5 class="text-info">طبيب - مراجع فني (${index})</h5>
            ${index > 1 ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()">حذف</button>` : ''}
        </div>
        <div class="row g-3 mt-1">
            <div class="col-md-4"><input type="text" class="form-control emp-name" value="${data?data.name:''}" placeholder="الاسم الرباعي (اختياري)"></div>
            <div class="col-md-4"><input type="text" class="form-control emp-id" value="${data?data.nationalID:''}" placeholder="الرقم القومي" maxlength="14"></div>
            <div class="col-md-4"><input type="text" class="form-control emp-phone" value="${data?data.phone:''}" placeholder="رقم التليفون"></div>
        </div>`;
    container.appendChild(div);
}

function addDataEntryRow(data = null) {
    const container = document.getElementById('dataEntryContainer');
    const index = container.children.length + 1;
    const div = document.createElement('div');
    div.className = 'employee-group border rounded p-3 mb-4 border-success';
    div.setAttribute('data-role', 'مدخل بيانات');
    div.innerHTML = `
        <div class="d-flex justify-content-between">
            <h5 class="text-success">مدخل بيانات (${index}) ${index === 1 ? '<span class="text-danger">*</span>' : ''}</h5>
            ${index > 1 ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()">حذف</button>` : ''}
        </div>
        <small class="text-danger d-block mb-2">له اسم مستخدم على المنظومة</small>
        <div class="row g-3">
            <div class="col-md-4"><input type="text" class="form-control emp-name" value="${data?data.name:''}" placeholder="الاسم الرباعي"></div>
            <div class="col-md-4"><input type="text" class="form-control emp-id" value="${data?data.nationalID:''}" placeholder="الرقم القومي" maxlength="14"></div>
            <div class="col-md-4"><input type="text" class="form-control emp-phone" value="${data?data.phone:''}" placeholder="رقم التليفون"></div>
        </div>`;
    container.appendChild(div);
}

function validateAndReview() {
    const emps = getEmployeeData();
    let errors = [];

    emps.forEach((e, idx) => {
        const isMandatory = (e.role === 'مدير طبي' || (e.role === 'مدخل بيانات' && idx === emps.findIndex(x => x.role === 'مدخل بيانات')));
        
        if (isMandatory && (!e.name || !e.nationalID || !e.phone)) {
            errors.push(`بيانات "${e.role}" الأساسي إجبارية بالكامل.`);
        }

        if (e.name || e.nationalID || e.phone) {
            if (e.name && !/^[a-zA-Z\u0600-\u06FF\s]+$/.test(e.name)) errors.push(`الاسم في "${e.role}" يجب أن يكون حروفاً فقط.`);
            if (e.nationalID && !/^\d{14}$/.test(e.nationalID)) errors.push(`الرقم القومي في "${e.role}" يجب أن يكون 14 رقماً.`);
            if (e.phone && !/^\d+$/.test(e.phone)) errors.push(`رقم التليفون في "${e.role}" يجب أن يكون أرقاماً فقط.`);
        }
    });

    if (errors.length > 0) return alert("تنبيه:\n" + errors.join("\n"));

    let html = '<table class="table table-bordered"><thead><tr class="table-dark"><th>الوظيفة</th><th>الاسم</th><th>الرقم القومي</th></tr></thead><tbody>';
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
    groups.forEach(g => {
        data.push({
            role: g.getAttribute('data-role'),
            name: g.querySelector('.emp-name').value.trim(),
            nationalID: g.querySelector('.emp-id').value.trim(),
            phone: g.querySelector('.emp-phone').value.trim()
        });
    });
    return data;
}

async function finalSubmit() {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.innerText = 'جاري الإرسال...';

    const payload = {
        branch: document.getElementById('branchSelect').value,
        centre: document.getElementById('centreSelect').value,
        employees: getEmployeeData().filter(e => e.name !== "")
    };

    try {
        const resp = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await resp.json();
        alert(res.message);
        if(res.status === 'success') location.reload();
    } catch (e) { alert("فشل الإرسال"); btn.disabled = false; }
}

function changeStep(n) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${n}`).classList.add('active');
    window.scrollTo(0,0);
}
