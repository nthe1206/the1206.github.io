// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, push, onValue, set, get, remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ========== cấu hình Firebase (dán giống như bạn đã có) ========== */
const firebaseConfig = {
  apiKey: "AIzaSyD9_pM1QPug4y_7FT1ltYg6-eUDgz17NOo",
  authDomain: "cantho-22806.firebaseapp.com",
  databaseURL: "https://cantho-22806-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cantho-22806",
  storageBucket: "cantho-22806.firebasestorage.app",
  messagingSenderId: "620807927683",
  appId: "1:620807927683:web:8e120572f2581e68e6a8b6",
  measurementId: "G-QPNY1FV450"
};

/* ========== init ========== */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* ========== DOM ========== */
const btnSignIn = document.getElementById('btnSignIn');
const btnSignOut = document.getElementById('btnSignOut');
const authName = document.getElementById('authName');

const commentBox = document.getElementById('commentBox');
const sendBtn = document.getElementById('sendComment');
const commentList = document.getElementById('commentList');
const visitCountEl = document.getElementById('visitCount');

const commentsRef = ref(db, 'comments');
const visitRef = ref(db, 'visits/count');

/* ========== Auth handlers ========== */
let currentUser = null;
let isAdmin = false;

btnSignIn.addEventListener('click', () => {
  signInWithPopup(auth, provider).catch(err => alert('Đăng nhập lỗi: ' + err.message));
});
btnSignOut.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    btnSignIn.style.display = 'none';
    btnSignOut.style.display = 'inline-block';
    authName.textContent = user.displayName || user.email;
    // kiểm tra admin flag trong DB
    try {
      const snap = await get(ref(db, `admins/${user.uid}`));
      isAdmin = snap.exists() && snap.val() === true;
    } catch (e) {
      console.error('Lỗi lấy admin flag', e);
      isAdmin = false;
    }
  } else {
    btnSignIn.style.display = 'inline-block';
    btnSignOut.style.display = 'none';
    authName.textContent = '';
    isAdmin = false;
  }
  // khi auth thay đổi, render lại comment (để hiển thị nút Xóa nếu admin)
  // lastSnapshot sẽ được cập nhật bởi onValue; gọi renderComments() nếu cần
  if (lastSnapshot) renderComments(lastSnapshot);
});

/* ========== visit counter (atomic-ish) ========== */
get(visitRef).then(snap => {
  let count = snap.exists() ? snap.val() : 0;
  count++;
  set(visitRef, count);
  visitCountEl.textContent = `👁️ Lượt truy cập: ${count}`;
}).catch(err => console.error(err));


/* ========== sanitize helper ========== */
function sanitize(input) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ========== submit comment ========== */
sendBtn.addEventListener('click', async () => {
  const raw = (commentBox.value || '').trim();
  if (!raw) return alert('Vui lòng nhập nội dung!');
  if (raw.length > 500) return alert('Bình luận quá dài (tối đa 500 ký tự).');

  const safe = sanitize(raw);
  const payload = {
    text: safe,
    timestamp: new Date().toLocaleString('vi-VN'),
    uid: currentUser ? currentUser.uid : null
  };

  try {
    await push(commentsRef, payload);
    commentBox.value = '';
  } catch (e) {
    alert('Gửi bình luận thất bại: ' + e.message);
  }
});

/* ========== render comments (realtime) ========== */
let lastSnapshot = null;

function renderComments(snapshot) {
  // nếu gọi trực tiếp với snapshot
  if (snapshot && typeof snapshot.val === 'function') lastSnapshot = snapshot;
  if (!lastSnapshot) {
    commentList.innerHTML = '<p>Đang tải bình luận...</p>';
    return;
  }
  const data = lastSnapshot.val();
  commentList.innerHTML = '';
  if (!data) {
    commentList.innerHTML = '<p>Chưa có bình luận nào — hãy là người đầu tiên!</p>';
    return;
  }

  // entries: [ [key,value], ... ] tăng dần theo thời gian
  const entries = Object.entries(data);
  // lấy 100 gần nhất, đảo để hiển thị mới nhất lên trên
  const recent = entries.slice(-100).reverse();

  const SHOW = 10;
  let shown = 0;

  for (const [key, obj] of recent) {
    if (shown >= SHOW) break;
    const div = document.createElement('div');
    div.className = 'comment';

    const p = document.createElement('p');
    p.textContent = obj.text;
    const s = document.createElement('span');
    s.textContent = obj.timestamp + (obj.uid ? ` • ${obj.uid}` : '');

    div.appendChild(p);
    div.appendChild(s);

    if (isAdmin) {
      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = 'Xóa';
      del.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
        try {
          await remove(ref(db, `comments/${key}`));
        } catch (e) {
          alert('Xóa lỗi: ' + e.message);
        }
      });
      div.appendChild(del);
    }

    commentList.appendChild(div);
    shown++;
  }

  if (recent.length > SHOW) {
    const more = document.createElement('button');
    more.className = 'more-btn';
    more.textContent = `Xem thêm ${recent.length - SHOW} bình luận cũ hơn`;
    more.addEventListener('click', () => {
      // hiển thị tất cả recent (đã reverse)
      commentList.innerHTML = '';
      for (const [key, obj] of recent) {
        const div = document.createElement('div');
        div.className = 'comment';
        const p = document.createElement('p'); p.textContent = obj.text;
        const s = document.createElement('span'); s.textContent = obj.timestamp + (obj.uid ? ` • ${obj.uid}` : '');
        div.appendChild(p); div.appendChild(s);
        if (isAdmin) {
          const del = document.createElement('button'); del.className='delete-btn'; del.textContent='Xóa';
          del.addEventListener('click', async () => {
            if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
            try { await remove(ref(db, `comments/${key}`)); } catch(e){ alert('Xóa lỗi: '+e.message); }
          });
          div.appendChild(del);
        }
        commentList.appendChild(div);
      }
      more.remove();
    });
    commentList.parentNode.appendChild(more);
  }
}

/* realtime listener */
onValue(commentsRef, (snap) => {
  lastSnapshot = snap;
  renderComments();
});
