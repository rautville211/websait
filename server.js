const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const User = require('./models/User');
const Photo = require('./models/Photo');
require('./config/passport');

const app = express();

mongoose.connect('mongodb://localhost/photo-upload-site', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost/photo-upload-site' })
}));
app.use(passport.initialize());
app.use(passport.session());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Регистрация
app.post('/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = new User({ username, password });
      await user.save();
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка при входе после регистрации', error: err });
        }
        res.json({ message: 'Добро пожаловать, ' + username, user: { username: user.username } });
      });
    } catch (err) {
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Ошибка при регистрации пользователя', error: err });
    }
  });

// Вход
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err || !user) {
      return res.status(400).json({ message: 'Неправильное имя пользователя или пароль', user });
    }
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка при входе', error: err });
      }
      res.json({ message: 'Добро пожаловать, ' + user.username, user: { username: user.username } });
    });
  })(req, res, next);
});

// Маршрут для загрузки фотографий
app.post('/upload', upload.single('photo'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(403).json({ message: 'Вы должны быть авторизованы для загрузки фотографий' });
    }
  
    try {
      const photo = new Photo({
        filename: req.file.filename,
        path: req.file.path,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        user: req.user._id
      });
      await photo.save();
      res.redirect('/');
    } catch (err) {
      res.status(500).json({ message: 'Ошибка при загрузке фотографии', error: err });
    }
  });

// Маршрут для лайков
app.post('/like/:photoId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).json({ message: 'Вы должны быть авторизованы для лайков' });
  }

  const photo = await Photo.findById(req.params.photoId);
  if (!photo) {
    return res.status(404).json({ message: 'Фотография не найдена' });
  }

  photo.likes.push(req.user._id);
  await photo.save();
  res.json({ message: 'Фотография лайкнута' });
});

// Маршрут для комментариев
app.post('/comment/:photoId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).json({ message: 'Вы должны быть авторизованы для комментирования' });
  }

  const photo = await Photo.findById(req.params.photoId);
  if (!photo) {
    return res.status(404).json({ message: 'Фотография не найдена' });
  }

  const comment = {
    text: req.body.text,
    user: req.user._id,
    created_at: new Date()
  };

  photo.comments.push(comment);
  await photo.save();
  res.json({ message: 'Комментарий добавлен', comment });
});

// Маршрут для отображения главной страницы
app.get('/', async (req, res) => {
  const photos = await Photo.find().populate('user').populate('comments.user').populate('likes');
  res.send(`
    <h1>Upload Photo</h1>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="photo" />
      <button type="submit">Upload</button>
    </form>
    <h2>Uploaded Photos</h2>
    <ul>
      ${photos.map(photo => `
        <li>
          <img src="/${photo.path}" width="200" />
          by ${photo.user.username}
          <form action="/like/${photo._id}" method="post">
            <button type="submit">Like (${photo.likes.length})</button>
          </form>
          ${photo.comments.map(comment => `
            <p>${comment.user.username}: ${comment.text}</p>
          `).join('')}
          <form action="/comment/${photo._id}" method="post">
            <input type="text" name="text" placeholder="Add a comment" />
            <button type="submit">Comment</button>
          </form>
        </li>
      `).join('')}
    </ul>
  `);
});

// Запуск сервера
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const User = require('./models/User');
const Photo = require('./models/Photo');
require('./config/passport');

const app = express();

mongoose.connect('mongodb://localhost/photo-upload-site', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost/photo-upload-site' })
}));
app.use(passport.initialize());
app.use(passport.session());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Регистрация
app.post('/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = new User({ username, password });
      await user.save();
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Ошибка при входе после регистрации', error: err });
        }
        res.json({ message: 'Добро пожаловать, ' + username, user: { username: user.username, id: user._id } });
      });
    } catch (err) {
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Ошибка при регистрации пользователя', error: err });
    }
  });

// Вход
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err || !user) {
      return res.status(400).json({ message: 'Неправильное имя пользователя или пароль', user });
    }
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка при входе', error: err });
      }
      res.json({ message: 'Добро пожаловать, ' + user.username, user: { username: user.username, id: user._id } });
    });
  })(req, res, next);
});

// Получение профиля пользователя
app.get('/profile/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).json({ message: 'Вы должны быть авторизованы для просмотра профиля' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при получении профиля пользователя', error: err });
  }
});

// Обновление профиля пользователя
app.post('/profile/:id', upload.single('avatar'), async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).json({ message: 'Вы должны быть авторизованы для обновления профиля' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    user.avatar = req.file ? req.file.path : user.avatar; // Обновление аватарки
    await user.save();
    res.json({ message: 'Профиль обновлен', user });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при обновлении профиля пользователя', error: err });
  }
});

// Маршрут для загрузки фотографий
app.post('/upload', upload.single('photo'), async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).json({ message: 'Вы должны быть авторизованы для загрузки фотографий' });
  }

  try {
    const photo = new Photo({
      filename: req.file.filename,
      path: req.file.path,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      user: req.user._id
    });
    await photo.save();
    res.redirect('/');
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при загрузке фотографии', error: err });
  }
});

// Маршрут для лайков
app.post('/like/:photoId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).json({ message: 'Вы должны быть авторизованы для лайков' });
  }

  try {
    const photo = await Photo.findById(req.params.photoId);
    if (!photo) {
      return res.status(404).json({ message: 'Фотография не найдена' });
    }

    if (!photo.likes.includes(req.user._id)) {
      photo.likes.push(req.user._id);
      await photo.save();
    }
    
    res.json({ message: 'Фотография лайкнута', likes: photo.likes.length });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при лайке фотографии', error: err });
  }
});

// Маршрут для комментариев
app.post('/comment/:photoId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(403).json({ message: 'Вы должны быть авторизованы для комментирования' });
  }

  try {
    const photo = await Photo.findById(req.params.photoId);
    if (!photo) {
      return res.status(404).json({ message: 'Фотография не найдена' });
    }

    const comment = {
      text: req.body.text,
      user: req.user._id,
      created_at: new Date()
    };

    photo.comments.push(comment);
    await photo.save();
    res.json({ message: 'Комментарий добавлен', comment });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при добавлении комментария', error: err });
  }
});

// Маршрут для отображения главной страницы
app.get('/', async (req, res) => {
  const photos = await Photo.find().populate('user').populate('comments.user').populate('likes');
  res.send(`
    <h1>Upload Photo</h1>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="photo" />
      <button type="submit">Upload</button>
    </form>
    <h2>Uploaded Photos</h2>
    <ul>
      ${photos.map(photo => `
        <li>
          <img src="/${photo.path}" width="200" />
          by ${photo.user.username}
          <form action="/like/${photo._id}" method="post">
            <button type="submit">Like (${photo.likes.length})</button>
          </form>
          ${photo.comments.map(comment => `
            <p>${comment.user.username}: ${comment.text}</p>
          `).join('')}
          <form action="/comment/${photo._id}" method="post">
            <input type="text" name="text" placeholder="Add a comment" />
            <button type="submit">Comment</button>
          </form>
        </li>
      `).join('')}
    </ul>
  `);
});

// Запуск сервера
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});