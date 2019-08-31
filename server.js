'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');
var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);
mongoose.connect(process.env.MONGO_URI, function(err) {
  if (err) { 
    console.log(err);
    } else {
    console.log("connected to db!")
  }
});

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

var shortUrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

var ShortUrl = mongoose.model("ShortUrl", shortUrlSchema);
//create one record to start database
/*var createAndSaveShortUrl = function(done) {
  var BestBuy = new ShortUrl({original_url: "https://www.bestbuy.com", short_url: 0});
  BestBuy.save(function (err, BestBuy) {
    if (err) return done(err);
    done(null, BestBuy);
    console.log(BestBuy);
  })
};*/

app.get("/api/shorturl/:urlCount", function(req, res, next) {
  var urlCount = req.params.urlCount;
  var findShortUrl = function(shortUrl) {
        ShortUrl.findOne({short_url: shortUrl}, function(err, doc){
            if (err) {
                res.send({"error": "error reading data base"});
            } else {
                if (doc !== null) {
                    res.redirect(doc.original_url);
                } else {
                    res.send({"error": "invalid Short URL"});
                }
            }
        })
    };
  
  if (!isNaN(urlCount)) {
      findShortUrl(urlCount); //if urlCount is a number check if it exists in the database
      } else {
      res.send({"error": "not a valid short URL format"});
  };
});

var count = null; //count is used to assign a number to short_url

var countDocs = ShortUrl.countDocuments({}, function(err, docCount) {
      if (err) {
        console.log(err);
      } else {
        count += docCount;
        console.log("current doc count is " + docCount);
        console.log("count is " + count);
      }
    });

app.post("/api/shorturl/new", function(req, res, next) {
  var url = req.body.url;
  console.log(url);

  var createNewShortUrlDocument = function(url) {
    var document = new ShortUrl({original_url: url, short_url: count + 1});
    console.log(document);
    document.save(function (err, record) {
      if (err) {
        console.log(err);
        } else {
          console.log(record);
          count += 1;
          res.json({"original_url": document.original_url, "short_url": document.short_url});
        }
    });
  };
  
  var findOriginalUrl = function(originalUrl) {
    ShortUrl.findOne({original_url: originalUrl}, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            if (doc !== null) { //if url found send url and short url
                res.json({"original_url": doc.original_url, "short_url": doc.short_url});
            } else {
                createNewShortUrlDocument(originalUrl); //if not found add to database
            }
        }
    })
  };

  var regex = /^https?:\/\/www/; //need this format for redirect
  
  if (regex.test(url)) {
  var dnsUrl = url.slice(url.indexOf("//") + 2); //need to remove http(s):// to pass to dns.lookup
  dns.lookup(dnsUrl, function(err, address, family) {  //check for valid url
    if (address !== undefined) {
      console.log(address);
      findOriginalUrl(url); //check to see if url exists in database
    } else {
      res.json({'error': "not a valid URL"});
      console.log(dnsUrl);
    }
  });  //dns.lookup
  } else {
  res.json({"error": "invalid URL format"})
}
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});