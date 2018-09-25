sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
	"use strict";

	return Controller.extend("ratings_frontend.ratings_frontend.controller.product_details", {

		/*
		* Every time your view is initialized, you get the call in this method.
		* We setup our Data Models and do the fetch data calls.
		* We setup the eventHandler for routematcher
		*/
		onInit: function () {
			//Setup the route matcher.
			//We do this because, on each navigation, the view isn't initialized.
			//We need to show data related to the selected product.
			//This code ensures an event callback every time the user navigate to this view.
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("Routeproduct_details").attachPatternMatched(this.onRouteMatched, this);

			var productDetails = new JSONModel();
			this.getView().setModel(productDetails, "productDetails");
			var reviewsModel = new JSONModel();
			this.getView().setModel(reviewsModel, "reviewsModel");
			var userRatingModel = new JSONModel();
			this.getView().setModel(userRatingModel, "userRatingModel");
		},

		/**
		 * Route match handler
		 * Updates the product details model.
		 * @param  {} oEvent
		 */
		onRouteMatched: function (oEvent) {
			var productDetails = this.getOwnerComponent().getModel("selectedProductModel").getProperty("/data");
			this.getView().getModel("productDetails").setData(productDetails);
			this.setReviewFeed();
		},

		/**
		 * Fetches the reviews and comments for the product whose details are current being viewed.
		 * Sets the reviews data to the reviews model.
		 */
		// setReviewFeed: function () {
		// 	var controller = this;
		// 	var productId = this.getView().getModel("productDetails").getData().productid;
		// 	var url = "/getReviewsList/" + productId;

		// 	jQuery.ajax({
		// 		url: url,
		// 		type: 'GET'
		// 	}).success(function (response) {
		// 		var data = {
		// 			"reviews": response
		// 		};
		// 		controller.getView().getModel("reviewsModel").setData(data);
		// 		controller.getView().setBusy(false);
		// 	}).error(function (e) {
		// 		controller.getView().setBusy(false);
		// 	});

		// },

		/**
		 * Fetches the updated product details from the server
		 * Sets the product details model
		 */
		updateSelectedProductDetails: function () {
			var controller = this;
			var selectedPrdocutId = controller.getOwnerComponent().getModel("selectedProductModel").getProperty("/data").productid;
			controller.getView().setBusy(true);

			var url = "/getWishList";
			jQuery
				.ajax({
					url: url,
					type: "GET",
					dataType: "json",
					headers: {
						'x-csrf-token': 'fetch'
					},
					complete: function (xhr) {
						sap.ui.getCore().AppContext.token = xhr.getResponseHeader("x-csrf-token");
					},
					success: function (response) {
						var data;
						response.forEach(product => { //We iterate over each returned list item to identify the current product.
							if (product.productid === selectedPrdocutId) {
								data = product;
							}
						});
						controller.getView().getModel("productDetails").setData(data); //Update the product details model as the average rating has changed.
						controller.getView().setBusy(false);
					},
					error: function (e) {
						console.log(e.message);
						controller.getView().setBusy(false);
					}
				});

		},

		/**
		 * We construct the path to the Image source
		 * @param  {} pictureName - Name of the picture
		 */
		formatImageSource: function (pictureName) {
			var headerPath = "/ratings_frontend/resources/images/";
			var completePath = headerPath + pictureName;
			return completePath;
		},

		/**
		 * Validates the input entered by user is valid
		 * @param  {} userInput
		 */
		isUserInputInvalid: function (userInput) {
			if (userInput === undefined) //The user input should not be empty
				return true;

			if (typeof userInput === "number") { //If the user input is not undefined and is a number, the input is valid.
				return false;
			}

			userInput = userInput.trim(); //If the user input is not defined and it has empty spaces it is invalid.
			if (userInput === "")
				return true;

			return false;
		},

		/**
		 * Clears the data from the model.
		 * @param  {} modelName - Name of the model
		 */
		clearModelData: function (modelName) {
			var emptyDataModel = new JSONModel();
			this.getView().setModel(emptyDataModel, modelName);
		},

		/**
		 * Event handler for submit button press.
		 * When a user adds a rating and a review, she/he clicks on the submit button.
		 * @param  {} oEvent
		 */
		// onSubmitRatingButtonPress: function (oEvent) {
		// 	var controller = this;

		// 	//Prepare user input data
		// 	var userRatingModel = controller.getView().getModel("userRatingModel");
		// 	var userRating = userRatingModel.getData().rating;
		// 	var userComment = userRatingModel.getData().comment;
		// 	var productId = controller.getView().getModel("productDetails").getData().productid;

		// 	//Validate user's input
		// 	if (controller.isUserInputInvalid(userRating) || controller.isUserInputInvalid(userComment)) {
		// 		MessageBox.error("The values you've entered are invalid. Please try again"); //Show a message box if the user input is invalid
		// 		return;
		// 	}

		// 	//Get the user information.
		// 	var userDetails = controller.getOwnerComponent().getModel("userInfo").getProperty("/data");

		// 	//Prepare user information
		// 	var firstName = userDetails.givenName;
		// 	var lastName = userDetails.familyName;
		// 	var userName = firstName + " " + lastName;
		// 	var email = userDetails.email;

		// 	//Prepare the data to be sent as part of the PUT API
		// 	var product_details = {
		// 		"rating": userRating,
		// 		"comment": userComment,
		// 		"userName": userName,
		// 		"email": email
		// 	};
		// 	var productDetails = JSON.stringify(product_details);

		// 	var url = "/putReviewComments/" + productId;

		// 	controller.getView().setBusy(true);

		// 	jQuery
		// 		.ajax({
		// 			url: url,
		// 			type: "PUT",
		// 			headers: {
		// 				'x-csrf-token': sap.ui.getCore().AppContext.token
		// 			},
		// 			data: productDetails,
		// 			contentType: "application/json",
		// 			success: function (response) {
		// 				controller.clearModelData("userRatingModel");
		// 				controller.setReviewFeed(); // New user comment has been added, we fetch the latest comments back from the server.
		// 				controller.updateSelectedProductDetails(); //The average rating has been updated, so fetch the latest list of products.
		// 				MessageToast.show("Rating submitted successfully"); //Toast message to show success.
		// 			},
		// 			error: function (e) {
		// 				console.log(e.message);
		// 				MessageBox.error("The values you've entered are invalid. Please try again"); //Message box to show error.
		// 			}
		// 		});
		// },

		/**
		 * Event handler for back button press
		 */
		onBack: function () {
			this.clearModelData("userRatingModel"); //Clear user entry
			this.getOwnerComponent().getRouter().navTo("Routeproducts_list"); //Navigate back to the products_list view
		}

	});
});