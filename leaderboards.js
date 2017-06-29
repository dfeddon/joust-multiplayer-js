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
    var listData = [];
    var boardIndex = 0;

    var scoreButton = document.getElementById('scoreButton');
    var killsButton = document.getElementById('killsButton');
    var wavesButton = document.getElementById('wavesButton');

    function clearTable()
    {
        var tb = document.getElementById('table');
        while(tb.rows.length > 1) 
        {
            tb.deleteRow(1);
        }
    }

    scoreButton.addEventListener('click', function()
    {
        clearTable();
        getTop10(0);
    });

    killsButton.addEventListener('click', function()
    {
        clearTable();
        getTop10(1);
    });

    wavesButton.addEventListener('click', function()
    {
        clearTable();
        getTop10(2);
    });
    
	function getTop10(index, range)
	{
        if (!range)
        {
            range = 1; // 1 = all time, 2 = month, 3 = week, 4 = today
        }
        var d = new Date();
        switch(range)
        {
            case 1: // all time
                break;
            case 2: // month
                d.setDate(d.getMonth() - 7); break;
            case 3: // this week (from last week)
                d.setDate(d.getDate() - 7); break;
            case 4: // today (from yesterday)
                d.setDate(d.getDate() - 1); break;
        }
        
        // convert date to epoch
        d.getTime() - d.getMilliseconds() / 1000;
        var dateFrom = (Date.parse(d)/1000).toFixed(3);
        console.log("* dateFrom", dateFrom);

        boardIndex = index;
		var gIndicies = ["TopScoreIndex", "TopKillsIndex", "TopWavesIndex"];
		var params = 
		{
			// Key:
			// {
			// 	"Userid": 1, // Requried: Primary partition key
			// 	"Date": 1498568140 // Requried: Primary sort key
			// },
			TableName: "Session",
			IndexName: gIndicies[index],//"TopScoresIndex",
			ScanIndexForward: false,
			KeyConditionExpression: 'GameId = :v_title',// and Date > :rkey',
			ExpressionAttributeValues: 
			{
				':v_title': 1//,
				// ':rkey': 2015
			},
			Limit: 20//10
		};
		// console.log(docClient);
		docClient.query(params, function (err, data) 
		{
			if (err) console.log(err, err.stack); // an error occurred
			else
            { 
                console.log("* got AWS item:", data); // successful response
                listData = data;
                buildList();
            }
		});

        function buildList()
        {
            var table = document.getElementById('table');
            var valueText = document.getElementById('valueText');
            var label;
            switch(boardIndex)
            {
                case 0: label = "Score"; break;
                case 1: label = "Kills"; break;
                case 2: label = "Waves"; break;
            }
            valueText.innerHTML = label;
            var row, cellRank, cellValue, cellPlayer;
            var nsPre = "<span style='font-size:15px;text-align:left;display:block'>"
            var nsPost = "</span>"
            var vsPre = "<span style='font-size:15px;text-align:right;display:block'>"
            var vsPost = "</span>"
            for (var i = 0; i < listData.Count; i++)
            {
                console.log(listData.Items[i]);
                row = table.insertRow();
                cellRank = row.insertCell(0);
                cellPlayer = row.insertCell(1);
                cellValue = row.insertCell(2);

                if (i === 0)
                {
                    // nsPre = "<span style='color:gold;font-size:19px;text-align:left;display:block'>";
                    // vsPre = "<span style='color:gold;font-size:19px;text-align:right;display:block'>";
                    nsPre = "<span style='background-color:gold;color:#8b5a00;font-size:19px;text-align:left;display:block'>";
                    vsPre = "<span style='background-color:gold;color:#8b5a00;font-size:19px;text-align:right;display:block'>";
                }
                else if (i < 5)
                {
                    nsPre = "<span style='color:orange;font-size:17px;text-align:left;display:block'>";
                    vsPre = "<span style='color:orange;font-size:17px;text-align:right;display:block'>";
                }
                else if (i < 10)
                {
                    nsPre = "<span style='color:#cd8500;font-size:15px;text-align:left;display:block'>";
                    vsPre = "<span style='color:#cd8500;font-size:15px;text-align:right;display:block'>";
                }
                else if (i < 15)
                {
                    nsPre = "<span style='color:#8b5a00;font-size:13px;text-align:left;display:block'>";
                    vsPre = "<span style='color:#8b5a00;font-size:13px;text-align:right;display:block'>";
                }
                else
                {
                    nsPre = "<span style='color:#8b5a2b;font-size:11px;text-align:left;display:block'>";
                    vsPre = "<span style='color:#8b5a2b;font-size:11px;text-align:right;display:block'>";
                }

                cellRank.innerHTML = nsPre + (i + 1) + vsPost;

                switch(boardIndex)
                {
                    case 0: // score
                        cellValue.innerHTML = vsPre + listData.Items[i].Score.toLocaleString() + vsPost;
                    break;

                    case 1: // kills
                        cellValue.innerHTML = vsPre + listData.Items[i].Kills.toLocaleString() + vsPost;
                    break;

                    case 2: // waves
                        cellValue.innerHTML = vsPre + listData.Items[i].Waves.toLocaleString() + vsPost;
                    break;
                }
                if (listData.Items[i].Name)
                    cellPlayer.innerHTML = nsPre + listData.Items[i].Name + nsPost;
                else cellPlayer.innerHTML = nsPre + "Guest_" + (Math.floor(Math.random() * 999) + 1) + nsPost;
            }

        }
	}
	// 0 = score, 1 = kills, 2 = waves
    if (listData.length === 0)
	    getTop10(0);
});