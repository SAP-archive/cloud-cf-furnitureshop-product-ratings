'use strict';
var request = require('request');
var xsenv = require('@sap/xsenv');

/***
 * Extract client id, client secret and url from the bound Destinations service VCAP_SERVICES object
 *
 * when the promise resolves it returns a client id, client secret and url of the token granting service
 *
 * @returns {Promise<any>}
 */
function getCredentials() {
    return new Promise(function(resolve) {
        var destination = xsenv.getServices({
            destination: {
                tag: 'destination'
            }
        }).destination;

        var credentials = {
            clientid: destination.clientid,
            clientsecret: destination.clientsecret,
            url: destination.url
        };

        resolve(credentials);
    });
}

/***
 * This creates a token for us from the supplied token granting service url, the clientid and the client
 * secret when the promise resolves
 *
 * The return value when the promise resolves is an object and not a string. The request API will turn the response
 * from a string into an object for us.
 *
 * @param destAuthUrl : url of the destination service token granting service - you will still need to append /oath/token to the url
 * @param clientId: the clientId used to get a token from the
 * @param clientSecret : the password to get a token
 * @returns {Promise<any>}
 */
function createToken(destAuthUrl, clientId, clientSecret) {
    return new Promise(function(resolve, reject) {
        // we make a post using x-www-form-urlencoded encoding for the body and for the authorization we use the
        // clientid and clientsecret.
        // Note we specify a grant_type and client_id as required to get the token
        // the request will return a JSON object already parsed
        var url = destAuthUrl + "/oauth/token";
        request({
                url: url,
                method: 'POST',
                json: true,
                form: {
                    grant_type: 'client_credentials',
                    client_id: clientId
                },
                auth: {
                    user: clientId,
                    pass: clientSecret
                }
            },
            function(error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    resolve(body.access_token);
                }
            });
    });
}

/***
 * This gets the destination using the supplied access token. We generated the access token using
 * createToken above.
 *
 * The destination has the uri field that holds the server(url) that will enable us to get the
 * destination details.
 *
 * -----------------------------------------
 * NOTE WE ASSUME A DESTINATION OF test dest
 * -----------------------------------------
 *
 * As above we do a GET request but instead of authentication we supply a bearer and access token
 * which give us access to the destination service for our service.
 *
 * The return value when the promise resolves is an object and not a string. The request API will turn the response
 * from a string into an object for us.
 *
 * @param access_token : the access token giving us access to the destination service
 * @param destinationName : the name of the destination to retrieve.
 * @returns {Promise<any>}
 */
function getDestination(access_token, destinationName) {
    return new Promise(function(resolve, reject) {
        var destination = xsenv.getServices({destination: {tag: 'destination'} }).destination;

        // Note that we use the uri and not the url!!!!
        var url = destination.uri + "/destination-configuration/v1/destinations/" + destinationName;
        request({
                url: url,
                method: 'GET',
                auth: {
                    bearer: access_token,
                },
                json: true,
            },
            function(error, response, body) {
                if (error) {
                    console.error('Error retrieving destination ' + error.toString());
                    reject(error);
                } else {
                    console.log('Retrieved destination ' + JSON.stringify(body));
                    resolve(body.destinationConfiguration);
                }
            });
    });
}

function getWishListDestinationUrl() {
    return new Promise(function (resolve, reject) {
        getCredentials()
            .then(function (credentials) {
                return createToken(credentials.url, credentials.clientid, credentials.clientsecret);
            })
            .then(function (access_token) {
                return getDestination(access_token, 'getWishlist');
            })
            .then(function (destination) {
                var url = destination.URL;
                console.log('Accessing ODATA URL ' + url);
                resolve(url);
            })
            .catch(function (error) {
                console.error('Error getting wishlist destination URL');
                reject(error);
            });
    });
}

function updateWishlistRating(id, averageRating) {
    console.log('Updating OData Wishlist id ' + id + ' with new rating ' + averageRating);

    return new Promise(function (resolve, reject) {
        console.log('Getting destination url for wishlist odata collection');

        getWishListDestinationUrl()
            .then(function (url) {
                console.log('Got destination url for wishlist odata collection ' + url);

                var wishListURL = url + '/odata/v2/CatalogService/Wishlist(' + id + ')';
                request({
                    method: 'PUT',
                    url: wishListURL,
                    body: {
                        "productRating": averageRating.toString()
                    },
                    json: true
                }, function(error, res, body) {
                    if (error) {
                        console.log('Failed to update wishlist rating ' + error.toString() + JSON.stringify(body));
                        reject(error);
                    } else {
                        console.log('Updated Wishlist ' + JSON.stringify(res));
                        resolve(res);
                    }
                });
            })
            .catch(function (error) {
                console.error('Error getting destination ' + error.toString());
                reject(error);
            });
    });
}

function readWishList() {
    console.log('Reading wishlist data');

    return new Promise(function (resolve, reject) {
        console.log('Getting destination url for wishlist odata collection');

        getWishListDestinationUrl()
            .then(function (url) {
                console.log('Read destination url ' + url);

                var wishListURL = url + '/odata/v2/CatalogService/Wishlist';

                request({
                    method: 'GET',
                    url: wishListURL,
                    json: true
                }, function(error, response) {
                    if (error) {
                        console.error('Error getting odata from wishlist API ' + error.toString());
                        reject(error);
                    } else {
                        console.log('Received Odata from wishlist API');
                        resolve(response.body);
                    }
                });
            })
            .catch(function (error) {
                console.error('Failed reading Wishlist data - ' + error.toString());
                reject(error);
            });
    });
}

module.exports = {
    updateWishlistRating: updateWishlistRating,
    readWishList: readWishList
};
