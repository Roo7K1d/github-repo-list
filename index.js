const express = require("express");
const github = require("github-api");
const fs = require("fs");
const trianglify = require('trianglify');

const app = express();
const port = 3000;

var config = JSON.parse(fs.readFileSync("config.json"));

var git = new github({ token: "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" });


app.set("view engine", "ejs");

app.use(express.static("views"));

var repos = fs.readFileSync('./repos.txt', 'utf8').split('\n');

var canvas = trianglify({
    width: 1920,
    height: 1080
}).toCanvas()

var file = fs.createWriteStream('./views/trianglify.png')
canvas.createPNGStream().pipe(file)


app.get("/", (req, res) => { 

    res.render("pages/index", {
        config: config,
        repos: repos,
        git: git
    })
})

app.listen(port, () => {
    console.log("Webserver started at https://localhost:" + port);
})