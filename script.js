// استبدل هذا الرابط برابط الـ Web App الذي حصلت عليه من Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxET001IrXMqHpqEUV8MfJuF6GRKdrkwVypUTga1v60RFAUiCLZEAsg0Pk9DPx3Mklfsw/exec'; 

let sourceData = [];

// 1. تحميل بيانات الفروع والمراكز عند فتح الصفحة
window.onload = async () => {
    try {
        const resp = await fetch(`${SCRIPT_URL}?action=get_source`);
        sourceData = await resp.json();
        
        const branches = [...new Set(sourceData.map(d => d.branch))];
        const bSelect = document.getElementById('branchSelect');
        bSelect.innerHTML = '<option value="">اختر الفرع...</option>';
        branches.forEach(b => {
            bSelect.innerHTML += `<option value="${b}">${b}</option>`;
        });
    } catch (e) {
        alert("خطأ في جلب البيانات الأساسية من السيرفر. تأكد من إعدادات الـ Apps Script.");
    }
};

// 2. تحديث قائمة المراكز بناءً على الفرع المختار
function updateCentres() {
    const branch = document.getElementById('branchSelect').value;
    const cSelect = document.getElementById('centreSelect');
    cSelect.innerHTML = '<option value="">اختر المركز...</option>';
    
    sourceData.filter(d => d.branch === branch).forEach(c => {
        cSelect.innerHTML += `<option value="${c.centre}">${c.centre}</option>`;
    });
}

// 3. التحقق من الخطوة الأولى وجلب بيانات المركز والفرع (التعديل الجوهري هنا)
async function validateStep1() {
    const branch = document.getElementById('branchSelect').value;
    const centre = document.getElementById('centreSelect').value;
    
    if(!branch || !centre) {
        return alert("الرجاء اختيار الفرع والمركز أولاً");
    }

    document.getElementById('displayLocation').innerText = `${branch} | ${centre}`;

    // إرسال الفرع والمركز معاً للسيرفر للتأكد من فرادة المكان
    const url = `${SCRIPT_URL}?action=get_centre_details&branch=${encodeURIComponent(branch)}&centre=${encodeURIComponent(centre)}`;
    
    try {
        const resp = await fetch(url);
        const result = await resp.json();

        // تفريغ الحاويات الديناميكية قبل البدء
        document.getElementById('doctorContainer').innerHTML = '';
        document.getElementById('dataEntryContainer').innerHTML = '';

        if (result.exists) {
            if (confirm(`توجد بيانات مسجلة مسبقاً لمركز (${centre}) بفرع (${branch}). هل تود تحميلها لتعديلها؟`)) {
                fillFormWithData(result.employees);
            } else {
                addDoctorRow(); 
                addDataEntryRow(); 
            }
        } else {
            addDoctorRow(); 
            addDataEntryRow(); 
        }
        changeStep(2);
    } catch (e) {
        alert("خطأ في الاتصال بالسيرفر");
    }
}

// 4. تعبئة النموذج بالبيانات المسترجعة من الشيت
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
    // التأكد من ظهور حقل واحد على الأقل لكل منهما للعرض
    if (document.getElementById('doctorContainer').children.length === 0) addDoctorRow();
    if (document.getElementById('dataEntryContainer').children.length === 0) addDataEntryRow();
}

// 5. إضافة صف طبيب مراجع (ديناميكي)
function addDoctorRow(data = null) {
    const container = document.getElementById('doctorContainer');
    const index = container.children.length + 1;
    const div = document.createElement('div');
    div.className = 'employee-group border rounded p-3 mb-4 border-info';
    div.setAttribute('data-role', 'طبيب مراجع فني');
    div.innerHTML = `
        <div class="d-flex justify-content-between">
            <h5 class="text-info fw-bold">طبيب - مراجع فني (${index})</h5>
            ${index > 1 ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()">حذف</button>` : ''}
        </div>
        <div class="row g-3 mt-1">
            <div class="col-md-4"><input type="text" class="form-control emp-name" value="${data?data.name:''}" placeholder="الاسم الرباعي"></div>
            <div class="col-md-4"><input type="text" class="form-control emp-id" value="${data?data.nationalID:''}" placeholder="الرقم القومي" maxlength="14"></div>
            <div class="col-md-4"><input type="text" class="form-control emp-phone" value="${data?data.phone:''}" placeholder="رقم التليفون" maxlength="11"></div>
        </div>`;
    container.appendChild(div);
}

// 6. إضافة صف مدخل بيانات (ديناميكي)
function addDataEntryRow(data = null) {
    const container = document.getElementById('dataEntryContainer');
    const index = container.children.length + 1;
    const div = document.createElement('div');
    div.className = 'employee-group border rounded p-3 mb-4 border-success';
    div.setAttribute('data-role', 'مدخل بيانات');
    div.innerHTML = `
        <div class="d-flex justify-content-between">
            <h5 class="text-success fw-bold">مدخل بيانات (${index}) ${index === 1 ? '<span class="text-danger">*</span>' : ''}</h5>
            ${index > 1 ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()">حذف</button>` : ''}
        </div>
        <div class="row g-3">
            <div class="col-md-4"><input type="text" class="form-control emp-name" value="${data?data.name:''}" placeholder="الاسم الرباعي"></div>
            <div class="col-md-4"><input type="text" class="form-control emp-id" value="${data?data.nationalID:''}" placeholder="الرقم القومي" maxlength="14"></div>
            <div class="col-md-4"><input type="text" class="form-control emp-phone" value="${data?data.phone:''}" placeholder="رقم التليفون" maxlength="11"></div>
        </div>`;
    container.appendChild(div);
}

// 7. التحقق من البيانات وعرض جدول المراجعة
function validateAndReview() {
    const emps = getEmployeeData();
    let errors = [];

    emps.forEach((e, idx) => {
        // تحديد الحقول الإجبارية (المدير الطبي + أول مدخل بيانات)
        const isMandatory = (e.role === 'مدير طبي' || (e.role === 'مدخل بيانات' && idx === emps.findIndex(x => x.role === 'مدخل بيانات')));
        
        if (isMandatory && (!e.name || !e.nationalID || !e.phone)) {
            errors.push(`بيانات "${e.role}" الأساسي إجبارية بالكامل.`);
        }

        // إذا تم ملء أي حقل، يجب التحقق من صحة الباقي في نفس السطر
        if (e.name || e.nationalID || e.phone) {
            if (e.name && !/^[a-zA-Z\u0600-\u06FF\s]+$/.test(e.name)) errors.push(`الاسم في "${e.role}" يجب أن يكون حروفاً فقط.`);
            if (e.nationalID && !/^\d{14}$/.test(e.nationalID)) errors.push(`الرقم القومي في "${e.role}" يجب أن يكون 14 رقماً.`);
            if (e.phone && !/^\d{11}$/.test(e.phone)) errors.push(`رقم التليفون في "${e.role}" يجب أن يكون 11 رقماً.`);
        }
    });

    if (errors.length > 0) return alert("يرجى تصحيح الأخطاء التالية:\n" + errors.join("\n"));

    // بناء جدول المراجعة
    let html = '<table class="table table-striped table-bordered"><thead><tr class="table-dark"><th>الوظيفة</th><th>الاسم</th><th>الرقم القومي</th><th>التليفون</th></tr></thead><tbody>';
    emps.filter(e => e.name).forEach(e => {
        html += `<tr><td>${e.role}</td><td>${e.name}</td><td>${e.nationalID}</td><td>${e.phone}</td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('reviewTable').innerHTML = html;
    changeStep(3);
}

// 8. تجميع بيانات الموظفين من النموذج
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

// 9. الإرسال النهائي للسيرفر
async function finalSubmit() {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; 
    btn.innerText = 'جاري الحفظ...';

    const payload = {
        branch: document.getElementById('branchSelect').value,
        centre: document.getElementById('centreSelect').value,
        employees: getEmployeeData().filter(e => e.name !== "")
    };

    try {
        const resp = await fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        const res = await resp.json();
        alert(res.message);
        if(res.status === 'success') location.reload();
    } catch (e) { 
        alert("فشل الإرسال. تأكد من جودة اتصال الإنترنت."); 
        btn.disabled = false; 
        btn.innerText = 'تأكيد وإرسال';
    }
}

// 10. التنقل بين الخطوات
function changeStep(n) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${n}`).classList.add('active');
    window.scrollTo(0,0);
}
