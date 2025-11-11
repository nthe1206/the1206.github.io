import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyClhUJbJvOdp8Cs0wZa1mVvzyshd7C8wGo",
  authDomain: "cantho-22806.firebaseapp.com",
  databaseURL: "https://cantho-22806-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cantho-22806",
  storageBucket: "cantho-22806.appspot.com",
  messagingSenderId: "620807927683",
  appId: "1:620807927683:web:xxxxxxxxxxxx"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const commentsRef = ref(db, "comments");
const adminsRef = ref(db, "admins");

const commentList = document.getElementById("commentList");
const commentInput = document.getElementById("commentInput");
const sendBtn = document.getElementById("sendBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;
let isAdmin = false;

// Đăng nhập
loginBtn.onclick = () => {
  signInWithPopup(auth, provider)
    .then(result => alert(`Đăng nhập thành công: ${result.user.email}`))
    .catch(err => alert("Lỗi đăng nhập: " + err.message));
};

// Đăng xuất
logoutBtn.onclick = () => {
  signOut(auth);
};

// Theo dõi user
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    sendBtn.disabled = false;

    onValue(adminsRef, (snapshot) => {
      const admins = snapshot.val() || {};
      isAdmin = !!admins[user.uid];
    });
  } else {
    currentUser = null;
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    sendBtn.disabled = true;
  }
});

// Gửi bình luận
sendBtn.onclick = () => {
  const text = commentInput.value.trim();
  if (!currentUser) {
    alert("Bạn cần đăng nhập để gửi bình luận!");
    return;
  }
  if (text === "") return;

  push(commentsRef, {
    text: text,
    user: currentUser.email,
    uid: currentUser.uid,
    timestamp: new Date().toLocaleString("vi-VN")
  });
  commentInput.value = "";
};

// Hiển thị bình luận
onValue(commentsRef, (snapshot) => {
  commentList.innerHTML = "";
  const data = snapshot.val();
  if (data) {
    const entries = Object.entries(data);
    entries.reverse().forEach(([key, cmt]) => {
      const div = document.createElement("div");
      div.classList.add("comment");

      div.innerHTML = `<p><strong>${cmt.user}</strong>: ${cmt.text}</p><small>${cmt.timestamp}</small>`;

      if (isAdmin) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "Xoá";
        delBtn.classList.add("deleteBtn");
        delBtn.onclick = () => {
          if (confirm("Xác nhận xoá bình luận này?")) remove(ref(db, "comments/" + key));
        };
        div.appendChild(delBtn);
      }
      commentList.appendChild(div);
    });
  } else {
    commentList.innerHTML = "<p>Chưa có bình luận nào.</p>";
  }
});
