const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);

// API helper
const api = async (url, method='GET', data=null, isForm=false) => {
  const opts = { method, credentials: 'include' };
  if (data && !isForm) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(data);
  }
  if (data && isForm) {
    opts.body = data;
  }
  const res = await fetch(url, opts);
  return await res.json();
};

// Login/Register modal
function showAuthModal(isRegister=false) {
  $('#loginModal').classList.remove('hide');
  $('#modalTitle').innerText = isRegister ? 'Đăng ký' : 'Đăng nhập';
  $('#authBtn').innerText = isRegister ? 'Đăng ký' : 'Đăng nhập';
  $('#registerFields').classList.toggle('hide', !isRegister);
  $('#switchAuth').innerText = isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Đăng ký tài khoản';
  $('#authErr').innerText = '';
  $('#authForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    let res;
    if (isRegister) {
      res = await api('/api/register','POST',{
        username: f.username.value, password: f.password.value, gender: f.gender.value
      });
      if (res.error) { $('#authErr').innerText = res.error; return; }
      showAuthModal(false);
      alert('Đăng ký thành công, vui lòng đăng nhập!');
    } else {
      res = await api('/api/login','POST',{
        username: f.username.value, password: f.password.value
      });
      if (res.error) { $('#authErr').innerText = res.error; return; }
      $('#loginModal').classList.add('hide');
      loadProfile();
      loadDocuments();
    }
  };
  $('#switchAuth').onclick = () => showAuthModal(!isRegister);
}

// Profile box
async function loadProfile() {
  const user = await api('/api/profile');
  $('#profileBox').innerHTML = `
    <img src="${user.avatar ? '/uploads/'+user.avatar : '/logo.png'}" class="avatar" id="myAvatar">
    <span>${user.username} (${user.gender==="male"?"Nam":user.gender==="female"?"Nữ":"Khác"})</span>
    <form id="avtForm" style="display:inline-block;">
      <label for="fileAvt" style="font-size:13px;">Đổi avatar</label>
      <input id="fileAvt" type="file" accept="image/*" style="width:110px;">
    </form>
    <button id="logoutBtn">Đăng xuất</button>
  `;
  $('#logoutBtn').onclick = async () => {
    await api('/api/logout','POST');
    showAuthModal(false);
  };
  $('#fileAvt').onchange = async (e) => {
    const fd = new FormData();
    fd.append('avatar', e.target.files[0]);
    const res = await api('/api/profile/avatar','POST', fd, true);
    if (res.avatar) $('#myAvatar').src = '/uploads/'+res.avatar;
  };
}

// List documents
async function loadDocuments() {
  const docs = await api('/api/documents');
  let html = '';
  docs.forEach(doc => {
    html += `
      <div class="doc-box">
        <div class="doc-title">${doc.title||"(Không có tên tài liệu)"}</div>
        <div style="margin-bottom:8px;color:#666;">Lớp ${doc.class||""} - ${doc.subject||""}</div>
        <div style="font-size:0.97rem;color:#444;">${doc.description||""}</div>
        <div class="doc-action">
          <button class="tym-btn" data-id="${doc.id}">❤️</button>
          <button class="chat-btn" data-id="${doc.id}">💬 Chat</button>
          <span id="tym-count-${doc.id}"></span>
        </div>
      </div>
    `;
  });
  $('#documents').innerHTML = html;

  // Like/tym
  $$('.tym-btn').forEach(btn => {
    const docId = btn.getAttribute('data-id');
    btn.onclick = async () => {
      await api(`/api/document/${docId}/like`, 'POST');
      loadTym(docId, btn);
    };
    loadTym(docId, btn);
  });

  // Chat
  $$('.chat-btn').forEach(btn => {
    btn.onclick = () => {
      const docId = btn.getAttribute('data-id');
      showChatModal(docId);
    };
  });
}

// Load tym
async function loadTym(docId, btn) {
  const res = await api(`/api/document/${docId}/like`);
  $(`#tym-count-${docId}`).innerText = ` ${res.total||0}`;
  if (res.liked) btn.classList.add('liked'); else btn.classList.remove('liked');
}

// Chat modal
async function showChatModal(docId) {
  $('#chatModal').classList.remove('hide');
  $('#chatModal').innerHTML = `<div class="modal"><div style="text-align:right"><button id="closeChatBtn" style="background:#d32f2f;color:#fff;padding:4px 12px;border-radius:7px;border:none;">Đóng</button></div>
    <div id="chatbox"></div>
    <form id="chatForm" autocomplete="off" style="margin-top:10px;">
      <input type="text" id="chatInput" autocomplete="off" placeholder="Nhập chat..." required>
      <button type="submit">Gửi</button>
    </form>
  </div>`;
  renderChat(docId);
  $('#closeChatBtn').onclick = ()=>$('#chatModal').classList.add('hide');
  $('#chatForm').onsubmit = async (e) => {
    e.preventDefault();
    const val = $('#chatInput').value.trim();
    if (!val) return;
    await api(`/api/document/${docId}/chat`, 'POST', { message: val });
    $('#chatInput').value = '';
    renderChat(docId);
  };
}

// Render chat content
async function renderChat(docId) {
  const msgs = await api(`/api/document/${docId}/chat`);
  let html = `<div class="chatbox">`;
  msgs.forEach(msg => {
    html += `
      <div class="chatmsg">
        <img src="${msg.avatar ? '/uploads/' + msg.avatar : '/logo.png'}" class="avatar">
        <div>
          <b>${msg.username}</b>: ${msg.message}
        </div>
      </div>
    `;
  });
  html += `</div>`;
  $('#chatbox').innerHTML = html;
}

// Khi tải trang
window.onload = async () => {
  try {
    await api('/api/profile');
    loadProfile();
    loadDocuments();
  } catch {
    showAuthModal(false);
  }
};