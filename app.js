let express = require('express');
let app = express();
let fs = require('fs');
let xml2js = require('xml2js');
let session = require('express-session');

const CoinGecko = require('coingecko-api');
const parser = new xml2js.Parser({ attrkey: "ATTR" });
const CoinGeckoClient = new CoinGecko();
app.engine('html', require('ejs').renderFile);


app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
    extended: true
}));

app.listen(3000, function () {
    console.log('Express app listening on port 3000');
});



app.get('/', function (request, response) {
    response.render(__dirname+'/views/index.html',{option:''});
})
app.get('/home', function (request, response) {
    if (request.session.loggedin) {

    bitcoinPriceInUah().then(r =>
        response.render(__dirname+'/views/home.html',{price:r})
            );
        }else{
        response.redirect('/')
}
})
app.get('/register', function (request, response) {
    response.render(__dirname+'/views/register.html',{option:''});
})
app.post('/register', function (request, response) {

    let username=request.body.username;
    let email=request.body.email;
    let password=request.body.password

    if(! (password===request.body.password2)) {
          response.render(__dirname+'/views/register.html',{option:'Passwords dont match!'});
        response.end();
    }else if(userExists(username,email)) {
        response.render(__dirname+'/views/register.html',{option:'User with this email or/and username already exists!'});
        response.end();
    }else {
        addUser(username, email, password);
        response.render(__dirname+'/views/index.html',{option:'Enter your new credentials!'});
    }
})

app.post('/login', function (request, response) {
    let xml_string = fs.readFileSync(__dirname+"/db.xml", "utf8");

    parser.parseString(xml_string, function(error, result) {
        if(error === null) {
            result.CREDENTIALS.USER.forEach(user=>{
                if((request.body.username.localeCompare(user.USERNAME[0])===0
                    || request.body.username.localeCompare(user.EMAIL[0])===0)
                    && request.body.password.localeCompare(user.PASSWORD[0])===0) {
                    request.session.loggedin = true;
                    request.session.username = user.USERNAME[0];
                    response.redirect('/home')
                    response.end();
                    return;
                }
            })
        }
        else {
            console.log(error);
        }

    })
    if(!request.session.loggedin) {
        response.render(__dirname+'/views/index.html',{option:'Not correct credentials. Try again'});
    }

})

let bitcoinPriceInUah = async() => {
    let data = await CoinGeckoClient.coins.fetch('bitcoin',{});
    return data.data.market_data.current_price.uah;
}
let addUser= function (username,email,password){
    let xml_string = fs.readFileSync(__dirname+"/db.xml", "utf8");

    parser.parseString(xml_string, (err, result) => {
        result.CREDENTIALS.USER.push({ USERNAME: username, EMAIL:email, PASSWORD:password});
        const builder = new xml2js.Builder();
        xml_string = builder.buildObject(result);
        fs.writeFileSync(__dirname+"/db.xml",xml_string, "utf8")// write data to file
    });
}
function userExists (username,email){
    let xml_string = fs.readFileSync(__dirname+"/db.xml", "utf8");
    let exists=false
   parser.parseString(xml_string, (err, result) => {
        result.CREDENTIALS.USER.forEach(user=>{
            if(username.localeCompare(user.USERNAME[0])===0
                || email.localeCompare(user.EMAIL[0])===0) {
                exists= true;
            }
        });
        });

        return exists;
}