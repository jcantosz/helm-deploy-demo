const express = require('express')
const app = express()
const port = 3000

var secret = process.env.FOO

app.get('/', (req, res) => {
  res.send("Hello World! This is staging. secret: " + secret)
})
app.get('/es', (req, res) => {
  res.send("Hola Mundo! Esto es puesta en escena. secreto: " + secret)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
})
