const express = require('express')
const app = express()
const { Server: ServerHttp } = require('http')
const { Server: ServerIo } = require('socket.io')

const Contenedor = require('./Contenedor')
const products = new Contenedor('products')
const users = new Contenedor('users')
const initializePassport = require('./passport-config')
const MongoStore = require('connect-mongo');

const httpServer = new ServerHttp(app)
const io = new ServerIo(httpServer)


if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
//mongo-connect
const mongoConfig = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}

initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)
app.use(flash())
app.use(session({
	secret:  '123456',
	resave: true,
	saveUninitialized: true,

	store: MongoStore.create({ mongoUrl: `mongodb+srv://gabo2395:lebron23JAMES@cluster0.78xslog.mongodb.net/?retryWrites=true&w=majority`, mongoOptions: mongoConfig })

}))
//app
app.set('view-engine', 'ejs')

app.use(express.static('public'))
app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', { name: req.user.name })
})

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
})
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname })
})
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
})
app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        })
        res.redirect('/login')
    } catch {
        res.redirect('/register')
    }
})
app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/login')
})

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}

io.on('connection', async (socket) => {
    const productos = await products.getAll()
    const usuarios = await users.getAll()

    socket.emit('mensaje-productos', { productos })
    socket.emit('mensaje-usuario', { usuarios })


    socket.on('producto-nuevo', (producto, cb) => {
        productos.push(producto)
        products.save(producto)
        const mensaje = {
            mensaje: 'productos insertado',
            productos
        }
        const id = new Date().getTime()
        io.sockets.emit('mensaje-productos', mensaje)
        cb(id)
    })





    socket.on('user-nuevo', (usuario) => {

        usuarios.push(usuario)
        users.save(usuario)
        const mensaje = {
            mensaje: 'usuario archivado',
            usuarios
        }
        const id = new Date().getTime()

        io.sockets.emit('mensaje-usuario', mensaje)

    })







})
const port = 3600
httpServer.listen(port, () => console.log(`Example app listening on port ${port}!`))