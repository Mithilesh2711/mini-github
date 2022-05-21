/*  EXPRESS */
const express = require('express');
const app = express();
const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");
const fs = require("fs");
const path = require("path")
const multer = require("multer")
const url = require('url');

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({
    extended: false
}))

app.set('view engine', 'ejs');
var access_token = "";

var pat = "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"

const clientID = 'c7687797ab5fba196518'
const clientSecret = '8899ed0c500ee179148b8ec54982314d3e814887'

app.get('/', function(req, res) {
  res.render('pages/index',{client_id: clientID});
});

const port = process.env.PORT || 2400;
app.listen(port , () => console.log('App listening on port ' + port));
const axios = require('axios');

// Declare the callback route
app.get('/github/callback', (req, res) => {

    const fsExtra = require('fs-extra')

    fsExtra.emptyDirSync('uploads/')

  const requestToken = req.query.code
  
  axios({
    method: 'post',
    url: `https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${requestToken}`,
    
    headers: {
         accept: 'application/json'
    }
  }).then((response) => {
    access_token = response.data.access_token
    res.redirect('/success');
  })
})

app.get('/success', function(req, res) {
  axios({
    method: 'get',
    url: `https://api.github.com/user`,
    headers: {
      Authorization: 'token ' + access_token
    }
  }).then(async (resp) => {
    axios({

        method: 'get',
        url: resp.data.repos_url,
        headers: {
          Authorization: 'token ' + access_token
        }
      }).then(async (response) => {
         
        if(req.query.success) 
        res.render('pages/success',{ userData: resp.data, userRepo: response.data, alert: true });
        else 
        res.render('pages/success',{ userData: resp.data, userRepo: response.data, alert: false });
      })
  })
});

var storage = multer.diskStorage(
    {
        destination: 'uploads/',
        filename: function ( req, file, cb ) {
            cb( null, file.originalname);
        }
    }
);

var upload = multer( { storage: storage } );

app.post('/createRepo', upload.single("myfile"), async function(req,res){
    const octokit = new Octokit({
        auth: pat
    });
        
    await octokit.request('POST /user/repos', {
            name: req.body.name
    })
    .then((response) =>{
        res.redirect(url.format({
            pathname:"/addFile",
            query: {
               "file": req.file.originalname,
               "name": req.body.name,
               "id":req.body.id
             }
        }));
    })

})

app.get('/addFile', async function(req,res){

    const content = fs.readFileSync(`uploads/${req.query.file}`, "utf-8");
    const contentEncoded = Base64.encode(content);

    const octokit = new Octokit({
        auth: pat
      })

    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner: req.query.id,
        repo: req.query.name,
        path: `${req.query.file}`,
        message: 'Initial commit - '+ Date.now(),
        content: contentEncoded,
    })
    .then((response) =>{
        res.render('pages/wait');
    })
})