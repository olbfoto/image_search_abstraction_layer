var express = require("express");
var bl = require('bl');
const app = express();
var fs = require('fs');
var mongoClient = require('mongodb').MongoClient;
var https = require('https');

var url = process.env.MONGOLAB_URI;

var offset = "";
//homepage
app.get("/", function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    fs.readFile("./index.html", function(err, html){
        if (err) throw err;
        res.write(html);
        res.end();
    });
});
//search 
app.get("/search/:str",function (request, response){
    if (request.query.offset != undefined){
        offset = "&start="+request.query.offset.toString();
    } else {
        offset = "";
    }
    https.get("https://www.googleapis.com/customsearch/v1?key="+process.env.API+"&cx="+process.env.cx+"&q="+request.params.str+"&searchType=image"+offset, function(res) {
        res.pipe(bl(function (err, data) {
            if (err) {
                return console.error(err);
            }
            response.setHeader('Content-Type', 'application/json');
            if (JSON.parse(data).items.length >0){
                for (var i=0; i<JSON.parse(data).items.length; i++){
                    response.write(JSON.stringify({
                                URL: JSON.parse(data).items[i].link,
                                Snippet: JSON.parse(data).items[i].snippet,
                                Context: JSON.parse(data).items[i].image.contextLink
                                }));
                }
            }
            response.end();
            // write a log to database
            mongoClient.connect(url,function (err, db){
                if (err) throw err;
                db.createCollection("History", function(err, col) {
                    if (err) throw err;
                });
                var collection = db.collection("History");
                collection.insertOne({SearchValue:request.params.str, TimeOfSearch: new Date().toISOString()}, function(err, r) {
                     if (err) throw err;
                    db.close(); 
                });
                
            });
      }));
    });
    
});
//history
app.get("/history", function(request, response) {
    mongoClient.connect(url,function (err, db){
                if (err) throw err;
                db.createCollection("History", function(err, col) {
                    if (err) throw err;
                });
                var collection = db.collection("History");
                collection.find().toArray(function (err, data){
                    if (err) throw err;
                    response.setHeader('Content-Type', 'application/json');
                    response.write(JSON.stringify(data));
                    db.close();
                    response.end();
                });
                
            });
            
})
app.listen(process.env.PORT);
