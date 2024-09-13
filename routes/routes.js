const express = require('express')
const router = express.Router()
const users = require('../data/users')
const axios = require('axios')

const {generateToken, verifyToken} = require('../middlewares/authMiddleware')

// Ruta de inicio
router.get('/', (req, res) => {
    if (!req.session.token) {
        const loginForm = `
        <form action="/login" method="post">
            <label for="username">Usuario:</label>
            <input type="text" id="username" name="username" required><br>
            
            <label for="password">Contraseña:</label>
            <input type="password" id="password" name="password" required><br>
        
            <button type="submit">Iniciar sesión</button>
        </form>
        <a href="/search">Búsqueda</a>
        `;
        res.send(loginForm);
    } else {
        res.send(`
            <h1> Bienvenido </h1>
            <a href="/search">Búsqueda</a>
            <form action="/logout" method="post"> 
                <button type="submit">Cerrar sesión</button> 
            </form>
        `);
    }
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username && u.password === password);

    if (!user) {
        res.status(401).json({ message: 'Credenciales incorrectas' });
    } else {
        const token = generateToken(user);
        req.session.token = token;
        res.redirect('/search');
    }
});

// Ruta de búsqueda de personajes
router.get('/search', verifyToken, (req, res) => {
    const userId = req.user;
    const user = users.find((u) => u.id === userId);
    
    if (!user) {
        res.status(401).json({ message: 'Usuario no encontrado' });
    } else {
        res.send(`
            <h1>Bienvenido, ${user.name}!</h1> 
            <form action="/characters/search" method="post">
                <input type="text" id="characterName" name="name" placeholder="Rick" required />
                <button type="submit">Obtener info</button>
            </form>
            <div id="characterInfo"></div>
            <form action="/logout" method="post"> 
                <button type="submit">Cerrar sesión</button> 
            </form> 
            <a href="/">Inicio</a>
        `);
    }
});

// Obtener todos los personajes
router.get("/characters", verifyToken, async (req, res) => {
    try {
        const url = "https://rickandmortyapi.com/api/character";
        const response = await axios.get(url);
        let data = [];
        const totalPages = response.data.info.pages;
        for (let i = 1; i <= totalPages; i++) {
            const responsePage = await axios.get(`${url}?page=${i}`);
            data.push(...responsePage.data.results);
        }
        res.json(data);
    } catch (err) { 
        res.status(500).json({ error: `Personaje no encontrado, ${err}` });
    }
});

// Búsqueda de personaje por nombre (POST redirige a GET)
router.post("/characters/search", verifyToken, (req, res) => {
    const name = req.body.name;
    res.redirect(`/characters/${name}`);
});

// Obtener personaje por nombre (GET)
router.get("/characters/:name", verifyToken, async (req, res) => {
    const name = req.params.name;
    const url = "https://rickandmortyapi.com/api/character";
    try {
        const response = await axios.get(`${url}?name=${name}`);
        let data = [];
        const totalPages = response.data.info.pages;
        for (let i = 1; i <= totalPages; i++) {
            const responsePage = await axios.get(`${url}?name=${name}&page=${i}`);
            data.push(...responsePage.data.results);
        }
        const characterList = data.map(character => {
            const { name, status, gender, species, image, origin: { name: origin } } = character;
            return { name, status, gender, species, image, origin };
        });
        res.json(characterList);
    } catch (err) { 
        res.status(500).json({ error: `Personaje no encontrado, ${err}` });
    }
});

// Cerrar sesión
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
