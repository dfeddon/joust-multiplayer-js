'use strict';

var domready = require('domready');

domready(function()
{
//document.addEventListener('DOMContentLoaded', function()
//{
	console.log('client DOM Loaded...');

	//*
	// amazon sdk globals
	AWS.config.region = "us-east-1";
	AWS.config.apiVersions = 
	{
		dynamodb: '2012-08-10',
		// other service API versions
	};
	AWS.config.credentials = new AWS.CognitoIdentityCredentials(
	{
		IdentityPoolId: 'us-east-1:b5e61654-606a-4082-adab-382e69a24413',
		Logins: 
		{ // optional tokens, used for authenticated login
		// 'graph.facebook.com': 'FBTOKEN',
		// 'www.amazon.com': 'AMAZONTOKEN',
		// 'accounts.google.com': 'GOOGLETOKEN'
		}
	});
	AWS.config.credentials.get(function(err)
	{
		if (err) console.log(err);
		// else console.log(AWS.config.credentials);
	})
	// amazon sdk
	
	// dynamodb
	// var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
	// docClient abstracts away the 'type-casting' requirement of the above dynamoDB
	var docClient = new AWS.DynamoDB.DocumentClient();
	function getTop10(index)
	{
		var gIndicies = ["TopScoreIndex", "TopKillsIndex", "TopWavesIndex"];
		var params = 
		{
			Key:
			{
				"Userid": 1, // Requried: Primary partition key
				"Date": 1498568140 // Requried: Primary sort key
			},
			TableName: "Session",
			IndexName: gIndicies[index],//"TopScoresIndex",
			ScanIndexForward: false,
			KeyConditionExpression: 'GameId = :v_title',// and Date > :rkey',
			ExpressionAttributeValues: 
			{
				':v_title': 1//,
				// ':rkey': 2015
			},
			Limit: 10
		};
		// console.log(docClient);
		docClient.query(params, function (err, data) 
		{
			if (err) console.log(err, err.stack); // an error occurred
			else console.log("* got AWS item:", data); // successful response
		});
	}
	// 0 = score, 1 = kills, 2 = waves
	getTop10(0);
});