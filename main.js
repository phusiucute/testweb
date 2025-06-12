// Popup quảng cáo
window.addEventListener("DOMContentLoaded", function() {
  const bg = document.getElementById('adsModalBg');
  const closeBtn = document.getElementById('adsModalClose');
  function closeAds() {
    bg.style.display = "none";
  }
  closeBtn.onclick = closeAds;
  bg.onclick = function(e) {
    if (e.target === bg) closeAds();
  }
  setTimeout(closeAds, 12000);
});

// Đếm ngược kỳ thi
const examDate = new Date("2025-06-26T07:45:00+07:00");
function updateExamCountdown() {
  const now = new Date();
  const diff = examDate - now;
  let days = 0, hours = 0, minutes = 0, seconds = 0;
  if (diff > 0) {
    days = Math.floor(diff / (1000 * 60 * 60 * 24));
    hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    minutes = Math.floor((diff / (1000 * 60)) % 60);
    seconds = Math.floor((diff / 1000) % 60);
  }
  document.getElementById("countdown-day").textContent = days.toString().padStart(2, "0");
  document.getElementById("countdown-hour").textContent = hours.toString().padStart(2, "0");
  document.getElementById("countdown-minute").textContent = minutes.toString().padStart(2, "0");
  document.getElementById("countdown-second").textContent = seconds.toString().padStart(2, "0");
}
setInterval(updateExamCountdown, 1000);
updateExamCountdown();

// Đếm ngược SALE
const saleEnd = new Date("2025-06-16T23:59:59+07:00");
function updateSaleCountdown() {
  const now = new Date();
  let diff = saleEnd - now;
  let days = 0, hours = 0, minutes = 0, seconds = 0;
  if (diff > 0) {
    days = Math.floor(diff / (1000 * 60 * 60 * 24));
    hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    minutes = Math.floor((diff / (1000 * 60)) % 60);
    seconds = Math.floor((diff / 1000) % 60);
  }
  document.getElementById("sale-day").textContent = days.toString().padStart(2, "0");
  document.getElementById("sale-hour").textContent = hours.toString().padStart(2, "0");
  document.getElementById("sale-min").textContent = minutes.toString().padStart(2, "0");
  document.getElementById("sale-sec").textContent = seconds.toString().padStart(2, "0");
}
setInterval(updateSaleCountdown, 1000);
updateSaleCountdown();

// Zalo FAB chat
const zaloFab = document.getElementById('zaloFab');
const zaloBalloon = document.getElementById('zaloBalloon');
let zaloBalloonTimer = null;
zaloFab.onclick = function() {
  window.open('https://zalo.me/0788559492', '_blank');
};
zaloFab.addEventListener('mouseenter', ()=>{
  zaloBalloon.style.display = 'block';
  clearTimeout(zaloBalloonTimer);
  zaloBalloonTimer = setTimeout(()=>{zaloBalloon.style.display='none'}, 4200);
});
zaloFab.addEventListener('mouseleave', ()=> {
  zaloBalloon.style.display = 'none';
  clearTimeout(zaloBalloonTimer);
});
setTimeout(()=>{zaloBalloon.style.display='block'; zaloBalloonTimer = setTimeout(()=>{zaloBalloon.style.display='none'}, 4000);},1500);

// === GOOGLE SHEET CODE GIỮ NGUYÊN ===
const SHEET_API = "https://opensheet.elk.sh/1hXvKb09Bu5xzqFAlgRjZ1S3Z0uQ8wjfDVQQn4uAuYH0/Sheet1";
const subjectList = ["toán","lý","hóa","sinh","sử","địa","văn","tiếng anh"];
let allDocs = [];
let classList = [];
let currentClass = "";
let currentSubject = subjectList[0];

function renderClassTabs() {
  const classTabs = document.getElementById("classTabs");
  classTabs.innerHTML = "";
  classList.forEach(cls => {
    const tab = document.createElement("div");
    tab.className = "tab" + (cls===currentClass ? " active" : "");
    tab.innerText = "Lớp " + cls;
    tab.onclick = () => {
      currentClass = cls;
      let found = subjectList.find(subj => allDocs.some(doc => doc.class === cls && doc.subject === subj));
      currentSubject = found || subjectList[0];
      renderClassTabs(); renderSubjectTabs(); renderDocs();
    };
    classTabs.appendChild(tab);
  });
}
function renderSubjectTabs() {
  const subjectTabs = document.getElementById("subjectTabs");
  subjectTabs.innerHTML = "";
  subjectList.forEach(sub => {
    if (allDocs.some(doc => doc.class === currentClass && doc.subject === sub)) {
      const tab = document.createElement("div");
      tab.className = "subject" + (sub===currentSubject ? " active" : "");
      tab.innerText = sub.charAt(0).toUpperCase() + sub.slice(1);
      tab.onclick = () => { currentSubject = sub; renderSubjectTabs(); renderDocs(); };
      subjectTabs.appendChild(tab);
    }
  });
}
function renderDocs() {
  const docList = document.getElementById("documentList");
  docList.innerHTML = "";
  const docs = allDocs.filter(doc => doc.class === currentClass && doc.subject === currentSubject);
  if (!docs || docs.length === 0) {
    docList.innerHTML = "<div style='grid-column:1/-1;text-align:center;color:#999;font-size:1.1rem'>Chưa có tài liệu cho mục này.</div>";
    return;
  }
  docs.forEach((doc, idx) => {
    const div = document.createElement("div");
    div.className = "doc-box";
    const key = "clicked_" + (doc.title||"") + "_" + (doc.class||"") + "_" + (doc.subject||"");
    div.onclick = () => {
      const isFirst = !localStorage.getItem(key);
      if(isFirst && doc.shopee_link){
        localStorage.setItem(key, "true");
        window.open(doc.shopee_link, "_blank");
      } else if(doc.drive_link) {
        window.open(doc.drive_link, "_blank");
      }
    };
    div.innerHTML = `<span class="doc-icon">📄</span>
      <span class="doc-title">${doc.title||"(Không có tên tài liệu)"}</span>
      <div class="doc-date">Cập nhật: ${doc.updatedAt||""}</div>
    `;
    docList.appendChild(div);
  });
}

fetch(SHEET_API)
  .then(res => res.json())
  .then(rows => {
    allDocs = rows.map(doc => ({
      ...doc,
      class: (doc.class||"").trim(),
      subject: (doc.subject||"").trim().toLowerCase(),
      title: (doc.title||"").trim(),
      drive_link: (doc.drive_link||"").trim(),
      shopee_link: (doc.shopee_link||"").trim(),
      updatedAt: (doc.updatedAt||"").trim()
    })).filter(doc => doc.class && doc.subject && doc.title);
    classList = [...new Set(allDocs.map(doc=>doc.class))].sort((a,b) => b-a);
    currentClass = classList[0] || "";
    let found = subjectList.find(subj => allDocs.some(doc => doc.class === currentClass && doc.subject === subj));
    currentSubject = found || subjectList[0];
    renderClassTabs();
    renderSubjectTabs();
    renderDocs();
  })
  .catch(e => {
    document.getElementById("documentList").innerHTML = "<div style='color:red'>Không tải được dữ liệu từ Google Sheet. Hãy kiểm tra lại ID Sheet và quyền chia sẻ!</div>";
  });