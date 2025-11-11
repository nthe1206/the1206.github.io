// === Firebase setup ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyClhUJbJvOdp8Cs0wZa1mVvzyshd7C8wGo",
  authDomain: "cantho-22806.firebaseapp.com",
  databaseURL: "https://cantho-22806-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cantho-22806",
  storageBucket: "cantho-22806.appspot.com",
  messagingSenderId: "620807927683",
  appId: "1:620807927683:web:xxxxxxxxxxxxxxx" // có thể giữ nguyên hoặc để trống cũng được
};

// === Khởi tạo ===
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const commentsRef = ref(db, "comments");
const visitsRef = ref(db, "visits/count");

// === Login & Logout ===
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("user-info");
const userPhoto = document.getElementById("user-photo");
const userName = document.getElementById("user-name");

loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => signOut(auth);

// === Xử lý người dùng ===
auth.onAuthStateChanged(user => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.style.display = "flex";
    userPhoto.src = user.photoURL;
    userName.textContent = user.displayName;
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userInfo.style.display = "none";
  }
});

// === Bình luận ===
const submitBtn = document.getElementById("submitBtn");
const commentInput = document.getElementById("commentInput");
const commentsList = document.getElementById("commentsList");

submitBtn.onclick = () => {
  const text = commentInput.value.trim();
  const user = auth.currentUser;
  if (!text) return alert("Vui lòng nhập bình luận!");
  const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // chống XSS
  const data = {
    text: safeText,
    user: user ? user.displayName : "Ẩn danh",
    photo: user ? user.photoURL : "https://i.imgur.com/Ob8FQ0R.png",
    uid: user ? user.uid : "guest",
    time: new Date().toLocaleString("vi-VN")
  };
  push(commentsRef, data);
  commentInput.value = "";
};

// === Hiển thị bình luận realtime ===
onValue(commentsRef, (snapshot) => {
  commentsList.innerHTML = "";
  snapshot.forEach(child => {
    const data = child.val();
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `
      <img src="${data.photo}" alt="user"/>
      <div class="comment-text">
        <strong>${data.user}</strong><br>${data.text}<br>
        <small>${data.time}</small>
      </div>
    `;
    if (auth.currentUser && data.uid === auth.currentUser.uid) {
      const del = document.createElement("button");
      del.className = "deleteBtn";
      del.textContent = "Xóa";
      del.onclick = () => remove(ref(db, "comments/" + child.key));
      div.appendChild(del);
    }
    commentsList.prepend(div);
  });
});

// === Đếm lượt truy cập ===
onValue(visitsRef, snap => {
  const count = snap.val() || 0;
  document.getElementById("visitCount").innerText = `Lượt truy cập: ${count}`;
});
update(visitsRef, { ".sv": { "increment": 1 } });
