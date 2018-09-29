'use strict';
var async = require("async");
var oData = require("../odata/odata");
var xsenv = require('@sap/xsenv');
// Module var
var __db;

var CREATE_PRODUCTS_TABLE_SQL =
    'CREATE TABLE IF NOT EXISTS product_details \
          ( \
              productID varchar, \
              productName varchar, \
              productDesc varchar, \
              averageRating real, \
              pictureURL varchar, \
              PRIMARY KEY (productID) \
          )';

var CREATE_COMMENTS_TABLE_SQL =
    'CREATE TABLE IF NOT EXISTS comments \
              ( \
                      userName varchar, \
                      email varchar, \
                      rating real, \
                      comments varchar, \
                      productID varchar, \
                      PRIMARY KEY(email, productID) \
              )';

function _connectToDB() {
    if (!__db) {
        // we create and initialize the connection
        var pgp = require('pg-promise')();

        var postgresqlEnv = xsenv.getServices({ postgresql: { tag: 'postgresql' } }).postgresql;
        console.log('ENV for Postgresql ' + JSON.stringify(postgresqlEnv));

        var dbConnStr = postgresqlEnv.uri;

        __db = pgp(dbConnStr);
    }

    return __db;
}


function writeWishlistEntitiesToDB(data, cb) {
    console.log("INSIDE writeWishlistEntitiesToDB in js");

    // we could also iterate over all the data items, creating a promise
    // for all then use Promise.all(promises array).then(....)
    var products = data.filter(function (product) {
        return product.productName && product.productName.trim();
    });

    console.log('Products to add: ' + products.length);

    var db = _connectToDB();
    db.none('DELETE FROM product_details')
        .then(function () {
            return db.none('DELETE FROM comments');
        })
        .then(function () {
            async.forEachOf(products, function (value, key, callback) {
                var id = value.ProductID;
                var name = value.productName;
                var desc = value.productDesc;
                var rating = value.productRating;
                var pictureURL = value.pictureURL;

                db.none('INSERT INTO product_details(productID, productName, productDesc, averageRating, pictureURL) VALUES($1, $2, $3, $4, $5)', [id, name, desc, rating, pictureURL])
                    .then(function () {
                        console.log('Created product ' + id);
                        callback();
                    })
                    .catch(function (error) {
                        console.error('Error uploading product ' + key + JSON.stringify(value));
                        callback(error);
                    });
            }, function (error) {
                if (error) {
                    console.error('Error uploading initial data ' + error.toString());
                    cb(error);
                } else {
                    console.log('Completed uploading of initial data');
                    cb();
                }
            });
        })
        .catch(function (error) {
            console.error('ERROR:_uploadInitialData ' + error.toString());
            cb(error);
        });
}


function uploadInitialData(cb) {
    console.log('uploadInitialData');

    oData.readWishList()
        .then(function (body) {

            var results = body.d.results;

            console.log('RESULTS: ' + JSON.stringify(results));

            writeWishlistEntitiesToDB(results,
                function (error) {
                    console.log('writeWishlistEntitiesToDB has finished');

                    if (error) {
                        console.error('Error uploading initial data to DB ' + error.toString());
                        cb(error);
                    } else {
                        console.log('Pushed data into DB');
                        cb();
                    }
                });
        })
        .catch(function (error) {
            console.error('Error uploadInitialData ' + error.toString());
            cb(error);
        });
}

function initializeDB(cb) {
    console.log("initializeDB ");

    var db = _connectToDB();

    db.none(CREATE_PRODUCTS_TABLE_SQL)
        .then(function () {
            console.log("productDetails created");
            return db.none(CREATE_COMMENTS_TABLE_SQL);
        })
        .then(function () {
            console.log("commentsTable created");
            cb();
        })
        .catch(function (error) {
            console.log('Error while creating productDetails table ' + error.toString());
            cb(error);
        });
}

function getAllProducts(cb) {
    var db = _connectToDB();

    db.manyOrNone('SELECT * FROM product_details')
        .then(function (data) {
            console.log('Retrieved products ' + JSON.stringify(data));
            cb(null, data);
        })
        .catch(function (error) {
            console.error('Error retrieving products ' + error.toString());
            cb(error);
        });
}

function getCommentsForProductId(id, cb) {
    var db = _connectToDB();

    db.manyOrNone('SELECT * FROM comments WHERE productID = $1', [id])
        .then(function (data) {
            console.log('Retrieved products ' + JSON.stringify(data));
            cb(null, data);
        })
        .catch(function (error) {
            console.error('Error retrieving product id ' + id + error.toString());
            cb(error);
        });
}


function _updateAverageRating(db, id) {
    console.log('entering updateAverageRating');

    var averageRating = 0;

    return new Promise(function (resolve, reject) {
        db.one('SELECT COUNT(productID) AS "number_of_ratings", SUM(rating) AS "total_ratings" ,productID  FROM comments WHERE productID = $1 GROUP BY productID', [id])
            .then(function (data) {
                console.log('Got average ratings ' + JSON.stringify(data));

                var totalRatings = data.total_ratings;
                var numberOfRatings = data.number_of_ratings || 1; // if there are ratings then divide by zero error!!!
                averageRating = totalRatings / numberOfRatings;

                console.log('Average rating is now ' + averageRating);

                return Promise.resolve(averageRating);
            })
            .then(function (averageRating) {
                console.log('Update product details with new average rating = ' + averageRating);
                return db.one('UPDATE product_details SET averageRating=$1 WHERE productID=$2 RETURNING *', [averageRating, id]);
            })
            .then(function () {
                console.log('Updating remote service');
                return oData.updateWishlistRating(id, averageRating);
            })
            .then(function () {
                console.log('Completed updating average rating');
                resolve();
            })
            .catch(function (error) {
                console.error('error updating average rating ' + error.toString());
                reject(error);
            });
    });
}

function modifyRatingANDComments(id, input, callback) {
    console.log('modifyRatingANDComments entered');

    var db = _connectToDB();
    var email = input.email;
    var username = input.userName;
    var rating = input.rating;
    var comment = input.comment;

    console.log('Properties: ' + id + email + username + rating + comment);

    db.one('SELECT COUNT(productID) AS "number_of_ratings" FROM comments WHERE productID = $1 AND email=$2', [id, email])
        .then(function (data) {
            console.log('Got number of ratings ' + JSON.stringify(data));

            if (parseInt(data.number_of_ratings)) {
                // we have ratings
                console.log('Updating rating');
                return db.one('UPDATE comments SET rating=$1,comments=$2 WHERE productID=$3 AND email=$4 RETURNING *', [rating, comment, id, email]);
            } else {
                console.log('creating rating');
                // no ratings at all so add a comment and rating
                return db.one('INSERT INTO comments(userName, email, rating,comments, productID) values($1,$2,$3,$4,$5) RETURNING *', [username, email, rating, comment, id]);
            }
        })
        .then(function () {
            console.log('Updating average rating for product ' + id);
            return _updateAverageRating(db, id);
        })
        .then(function () {
            console.log('updateAverageRating completed successfully');
            callback();
        })
        .catch(function (error) {
            console.error('Error in modifyRatingANDComments ' + error.toString());
            callback(error);
        });
}

module.exports = {
    initializeDB: initializeDB,
    uploadInitialData: uploadInitialData,
    getAllProducts: getAllProducts,
    modifyRatingANDComments: modifyRatingANDComments,
    getCommentsForProductId: getCommentsForProductId,
};
