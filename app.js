const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const benchpress = require('benchpressjs');

const app = express();
const PORT = 3000;

// DB 연결
mongoose.connect('mongodb://localhost:27017/mminimal');

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 세션 디버깅 미들웨어
app.use((req, res, next) => {
  console.log('Session debug:', {
    sessionId: req.sessionID,
    userId: req.session.userId,
    isAuthenticated: !!req.session.userId,
    path: req.path,
    method: req.method
  });
  next();
});

// 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 라우트
app.use('/', require('./src/routes'));

// 메인 페이지 핸들러
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/boards');
  } else {
    res.redirect('/login');
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
