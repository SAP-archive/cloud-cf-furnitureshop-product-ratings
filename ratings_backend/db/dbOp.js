'use strict';
const async = require("async");
const oData = require("../odata/odata");
const xsenv = require('@sap/xsenv');
// Module var
let __db;

const CREATE_PRODUCTS_TABLE_SQL =
    'CREATE TABLE IF NOT EXISTS product_details \
          ( \
              productID varchar, \
              productName varchar, \
              productDesc varchar, \
              averageRating real, \
              pictureURL varchar, \
              PRIMARY KEY (productID) \
          )';

const CREATE_COMMENTS_TABLE_SQL =
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
        // we create and intialize the connection
        const pgp = require('pg-promise')();

        const postgresqlEnv = xsenv.getServices({postgresql: {tag: 'postgresql'}}).postgresql;
        console.log(`ENV for Postgres ${JSON.stringify(postgresqlEnv)}`);

        const dbConnStr = postgresqlEnv.uri;

        __db = pgp(dbConnStr);
    }

    return __db;
}


function writeWishlistEntitiesToDB(data, cb) {
    console.log("INSIDE writeWishlistEntitiesToDB in js");

    // we could also iterate over all the data items, creating a promise
    // for all then use Promise.all(promises array).then(....)
    const products = data.filter(function (product) { return product.productName && product.productName.trim()});

    console.log(`Products to add: ${products.length}`);

    const db = _connectToDB();
    db.none('DELETE FROM product_details')
        .then(function() {
            return db.none('DELETE FROM comments');
        })
        .then(function () {
            async.forEachOf(products, function(value, key, callback) {
                const id = value.ProductID;
                const name = value.productName;
                const desc = value.productDesc;
                const rating = value.productRating;
                const pictureURL = value.pictureURL;

                db.none('INSERT INTO product_details(productID, productName, productDesc, averageRating, pictureURL) VALUES($1, $2, $3, $4, $5)', [id, name, desc, rating, pictureURL])
                    .then(function () {
                        console.log(`Created product ${id}`);
                        callback();
                    })
                    .catch(function(error) {
                        console.error(`Error uploading product ${key} ${JSON.stringify(value)}`);
                        callback(error);
                    });
            }, function (error) {
                if (error) {
                    console.error(`Error uploading initial data ${error.toString()}`);
                    cb(error);
                } else {
                    console.log('Completed uploading of initial data');
                    cb();
                }
            });
        })
        .catch(function (error) {
            console.error(`ERROR:_uploadInitialData ${error.toString()}`);
            cb(error);
        })
}


// function uploadInitialData(cb) {
//     console.log('uploadInitialData');

//     oData.readWishList()
//         .then(function (body) {

//             const results = body.d.results;

//             console.log(`RESULTS: ${JSON.stringify(results)}`);

//             writeWishlistEntitiesToDB(results,
//                 function (error) {
//                     console.log('writeWishlistEntitiesToDB has finished');

//                     if (error) {
//                         console.error(`Error uploading initial data to DB ${error.toString()}`);
//                         cb(error)
//                     } else {
//                         console.log('Pushed data into DB');
//                         cb();
//                     }
//                 });
//         })
//         .catch(function(error) {
//             console.error(`Error uploadInitialData ${error.toString()}`);
//             cb(error);
//         });
// }

// function initializeDB(cb) {
//     console.log("initializeDB ");

//     const db = _connectToDB();

//     db.none(CREATE_PRODUCTS_TABLE_SQL)
//         .then(function() {
//             console.log("productDetails created");
//             return db.none(CREATE_COMMENTS_TABLE_SQL);
//         })
//         .then( function () {
//             console.log("commentsTable created");
//             cb();
//         })
//         .catch((error) => {
//             console.log(`Error while creating productDetails table ${error.toString()}`);
//             cb(error);
//         });
// }

function getAllProducts(cb) {
    const db = _connectToDB();

    db.manyOrNone('SELECT * FROM product_details')
        .then(function(data) {
            console.log(`Retrieved products ${JSON.stringify(data)}`);
            cb(null, data)
        })
        .catch(function(error) {
            console.error(`Error retrieving products ${error.toString()}`);
            cb(error);
        })
}

function getCommentsForProductId(id, cb) {
    const db = _connectToDB();

    db.manyOrNone('SELECT * FROM comments WHERE productID = $1', [id])
        .then(function(data) {
            console.log(`Retrieved products ${JSON.stringify(data)}`);
            cb(null, data)
        })
        .catch(function(error) {
            console.error(`Error retrieving product id ${id} ${error.toString()}`);
            cb(error);
        })
}


function _updateAverageRating(db, id) {
    console.log('entering updateAverageRating');

    let averageRating = 0;

    return new Promise(function (resolve, reject) {
        db.one('SELECT COUNT(productID) AS "number_of_ratings", SUM(rating) AS "total_ratings" ,productID  FROM comments WHERE productID = $1 GROUP BY productID', [id])
            .then(function(data) {
                console.log(`Got average ratings ${JSON.stringify(data)}`);

                const totalRatings = data.total_ratings;
                const numberOfRatings = data.number_of_ratings || 1; // if there are ratings then divide by zero error!!!
                averageRating = totalRatings / numberOfRatings;

                console.log(`Average rating is now ${averageRating}`);

                return Promise.resolve(averageRating);
            })
            .then(function (averageRating) {
                console.log(`Update product details with new average rating = ${averageRating}`);
                return db.one('UPDATE product_details SET averageRating=$1 WHERE productID=$2 RETURNING *', [averageRating, id]);
            })
            .then(function() {
                console.log('Updating remote service');
                return oData.updateWishlistRating(id, averageRating);
            })
            .then(function() {
                console.log('Completed updating average rating');
                resolve();
            })
            .catch(function (error) {
                console.error(`error updating average rating ${error.toString()}`);
                reject(error);
            });
    });
}

function modifyRatingANDComments(id, input, callback) {
    console.log('modifyRatingANDComments entered');

    const db = _connectToDB();
    const email = input.email;
    const username = input.userName;
    const rating = input.rating;
    const comment = input.comment;

    console.log(`Properties: ${id} ${email} ${username} ${rating} ${comment}`);

    db.one('SELECT COUNT(productID) AS "number_of_ratings" FROM comments WHERE productID = $1 AND email=$2', [id, email])
        .then(function (data) {
            console.log(`Got number of ratings ${JSON.stringify(data)}`);

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
        .then (function () {
            console.log(`Updating average rating for product ${id}`);
            return _updateAverageRating(db, id);
        })
        .then(function() {
            console.log(`updateAverageRating completed successfully`);
            callback();
        })
        .catch(function (error) {
            console.error(`Error in modifyRatingANDComments ${error.toString()}`);
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
