  sap.ui.define([
  	"sap/ui/core/mvc/Controller",
  	"sap/ui/model/json/JSONModel"
  ], function (Controller, JSONModel) {
  	"use strict";

  	return Controller.extend("ratings_frontend.ratings_frontend.controller.products_list", {

  			/**
		 * Everytime your view is initialized, you get the call in this method.
		 * We setup our Data Models and do the fetch data calls.
		 */
		onInit: function () {
			var productList = new JSONModel();
			this.getView().setModel(productList, "products");
			this.getLoggedInUserData();
			this.getProductsList();
		},

		/**
		 * Fetches the information of the logged in user from the server (ratings_and_comments app).
		 * Sets the user information to a global context model.
		 */
		getLoggedInUserData: function () {
			//We make a get call to fetch the user information.
			//To see the back-end mapping go to xs-app.json
			var controller = this;
			var url = "/getUserInfo";
			jQuery.ajax({
				url: url,
				type: "GET",
				headers: {
					'x-csrf-token': 'fetch'
				},
				complete: function (xhr) {
					sap.ui.getCore().AppContext.token = xhr.getResponseHeader("x-csrf-token");
				},
				success: function (response) {
					//Set the user information data in an owner component model (Model that can be accessed from any view)
					controller.getOwnerComponent().getModel("userInfo").setProperty("/data", response);
				},
				error: function (e) {
					console.log(e.message);
				}
			});
		},



		// /**
		//  * Fetches the list of products from the server.
		//  * Sets the list details to a local view model.
		//  * Do not uncomment this portion
		//  */


		// getProductsList: function () {
		// 	//We make a get call to fetch the product list
		// 	//To see the back-end mapping go to xs-app.json
		// 	var controller = this;
		// 	controller.getView().setBusy(true);

		// 	var url = "/getWishList";
		// 	jQuery
		// 		.ajax({
		// 			url: url,
		// 			type: "GET",
		// 			dataType: "json",
		// 			headers: {
		// 				'x-csrf-token': 'fetch'
		// 			},
		// 			complete: function (xhr) {
		// 				sap.ui.getCore().AppContext.token = xhr.getResponseHeader("x-csrf-token");
		// 			},
		// 			success: function (response) {
		// 				var data = {
		// 					"productList": response
		// 				};
		// 				controller.getView().getModel("products").setData(data);
		// 				controller.getView().setBusy(false);
		// 			},
		// 			error: function (e) {
		// 				console.log(e.message);
		// 				controller.getView().setBusy(false);
		// 			}
		// 		});

		// },

		/**
		 * We construct the path to the Image source
		 * @param  {} pictureName - Name of the picture
		 */
		formatIconSource: function (pictureName) {
			var headerPath = "/ratings_frontend/resources/icons/ico_";
			var completePath = headerPath + pictureName;
			return completePath;
		},

		/**
		 * Event handler for Refresh Button
		 * Re-fetches the products list from the server and updates the model.
		 * @param  {} oEvent //Not used in this method.
		 */
		onRefreshProductsButtonPressed: function (oEvent) {
			this.getProductsList();
		},



		// /** Event handler for Table Selection
		//  * It sets the selected item details to a global context model, and
		//  * Navigates to the Details View.
		//  * @param  {} oEvent
		//  * Do not uncomment this portion
		//  */


		// onProductSelection: function (oEvent) {
		// 	//We identify the selected product form the event object and the binding context
		// 	var bindingContextPath = oEvent.getSource().getBindingContextPath();
		// 	var productsModel = this.getView().getModel("products");
		// 	var selectedProduct = productsModel.getProperty(bindingContextPath);

		// 	//Set the selected product data in an owner component model (Model that can be accessed from any view)
		// 	this.getOwnerComponent().getModel("selectedProductModel").setProperty("/data", selectedProduct);

		// 	//Navigate to product_details view
		// 	this.getOwnerComponent().getRouter().navTo("Routeproduct_details");
		// }

  	});
  });