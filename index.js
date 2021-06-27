const express = require("express");
const github = require("github-api");
const fs = require("fs");
const readline = require('readline');
const editJsonFile = require("edit-json-file");

const rl = readline.createInterface({
    input: fs.createReadStream('./repos.txt'),
    output: process.stdout,
    terminal: false
});

const app = express();
const port = 3000;

var config = JSON.parse(fs.readFileSync("config.json"));

var git = new github();


app.set("view engine", "ejs");

app.use(express.static("views"));


rl.on('line', async function (line) {
    var data = line.split(":")
    var repo = git.getRepo(data[0], data[1])
    if (!fs.existsSync(`./views/repos/${data[1]}.json`)) {
        fs.writeFileSync(`./views/repos/${data[1].toString()}.json`, "{}")
    }
    let file = editJsonFile(`./views/repos/${data[1]}.json`);
    await repo.getContributors().then(async function (result) {
        await file.set("repo_contributors", result.data.length)
    })
    await repo.getDetails().then(async function (resultDetails) {

        var obj = JSON.parse(fs.readFileSync("./views/lang_colors.json"));
        var langColor = obj[resultDetails.data.language];

        await file.set("owner_avatar_url", resultDetails.data.owner.avatar_url)
        await file.set("owner_login", resultDetails.data.owner.login)
        await file.set("owner_html_url", resultDetails.data.owner.html_url)
        await file.set("repo_html_url", resultDetails.data.html_url)
        await file.set("repo_name", resultDetails.data.name)
        await file.set("repo_open_issues", resultDetails.data.open_issues.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
        await file.set("repo_watchers", resultDetails.data.watchers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
        await file.set("repo_forks", resultDetails.data.forks.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
        await file.set("repo_desc", resultDetails.data.description)
        await file.set("repo_lang", resultDetails.data.language)
        await file.set("repo_lang_color", langColor)
        await file.save()
    })
});

app.get("/", (req, res) => {

    res.render("pages/index", {
        config: config,
        fs: fs
    })
})

app.listen(port, () => {
    console.log("Webserver started at http://localhost:" + port);
})
