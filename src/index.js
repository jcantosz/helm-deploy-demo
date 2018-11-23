const express = require('express')
const app = express()
const port = 3000

var secret = process.env.FOO

app.get('/', (req, res) => {
  res.send("Hello World! This is production. secret: " + secret)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
})
