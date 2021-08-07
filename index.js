const express = require("express");
const github = require("github-api");
const fs = require("fs");
const readline = require('readline');
const editJsonFile = require("edit-json-file");
const MarkdownIt = require('markdown-it');

const {
    Octokit
} = require("@octokit/core");

const rl = readline.createInterface({
    input: fs.createReadStream('./repos.txt'),
    output: process.stdout,
    terminal: false
});

const app = express();
const port = 3000;

var config = JSON.parse(fs.readFileSync("config.json"));

const octokit = new Octokit({
    auth: config.token
});

var git = new github({
    token: config.token
});

app.set("view engine", "ejs");

app.use(express.static("views"));


rl.on('line', async function (line) {
    var data = line.split(":")
    var repo = git.getRepo(data[0], data[1])
    if (!fs.existsSync(`${__dirname}/views/repos/${data[1]}.json`)) {
        fs.writeFileSync(`${__dirname}/views/repos/${data[1].toString()}.json`, "{}")
    }
    let file = editJsonFile(`${__dirname}/views/repos/${data[1]}.json`);

    /*
    await repo.getContributors().then(async function (result) {
        await file.set("repo_contributors", result.data.length)
    })
    */

    await repo.getDetails().then(async function (resultDetails) {

        await octokit.request('GET /repos/{owner}/{repo}/contributors', {
            owner: resultDetails.data.owner.login,
            repo: resultDetails.data.name,
            per_page: "1",
            anon: true
        }).then(async function (result) {
            if (result.headers.link == undefined) {
                await file.set("repo_contributors", 1)
            } else {
                var contribs = result.headers.link.split(",").toString().split("&page=")
                await file.set("repo_contributors", contribs[2].replace(/\D/g, "").toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
            }
            await file.save()
        })

        await octokit.request('GET /repos/{owner}/{repo}/languages', {
            owner: resultDetails.data.owner.login,
            repo: resultDetails.data.name
        }).then(async function (result) {
            await file.set("repo_langlist", result.data)

            await octokit.request('GET /repos/{owner}/{repo}/readme', {
                owner: resultDetails.data.owner.login,
                repo: resultDetails.data.name,
                headers: {
                    Accept: "application/vnd.github.VERSION.raw"
                }
            }).then(async function (result) {
                md = new MarkdownIt();
                var resultMd = md.render(result.data);

                fs.writeFileSync(`${__dirname}/views/markdowns/${resultDetails.data.name}.html`, resultMd)
            })

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
            if (resultDetails.data.license !== null) {
                await file.set("repo_license", resultDetails.data.license.spdx_id)
            } else {
                await file.set("repo_license", null)
            }
            await file.save()
        })

    })

    await repo.listTags().then(async function (resultTags) {
        if (resultTags.data.length > 0) {
            await file.set("repo_latest_release", resultTags.data[0].name)
        } else {
            await file.set("repo_latest_release", "undefined")
        }
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
    console.log("If you like this project please remember to give it a star :) https://github.com/roo7k1d/github-repo-list-expressjs");
})