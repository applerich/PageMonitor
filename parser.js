var request	= require('request');
var cheerio	= require('cheerio');
var fs		= require('fs');
var sys		= require('sys');
var exec	= require('child_process').exec;
var path	= require('path');
var open	= require('open');
var _		= require('underscore');



var diff = function(A, B) {

	return A.filter(function (a) {
		return B.indexOf(a) == -1;
	});
};



exports.parse = function(url, options) {

	// JSON database
	var json_file = path.resolve(__dirname, 'storage/' + options.name + '.json');

	// create if not exists
	if ( !fs.existsSync(json_file) )
		fs.writeFileSync(json_file, JSON.stringify( [] ));

	// load database
	var database = JSON.parse( fs.readFileSync(json_file) );

	// OS X notification
	exec('osascript -e \'display notification "parsing..." with title "' + options.name + '"\'');

	// cookie jar
	var jar = request.jar();

	// add custom cookie to jar
	if ( options.cookie ) {

		var cookie = request.cookie( options.cookie );
		jar.setCookie(cookie, url);
	}

	// make the request
	request({

		url: url,
		jar: jar

	}, function(error, response, body) {

		// load jQuery
		var $ = cheerio.load(body);

		// empty array
		var found = [];

		// loop through items
		$(options.selector).each(function() {

			if ( !$(this).attr( options.attribute ) )
				return;

			var attribute = $(this).attr( options.attribute );

			// attribute modify
			if ( options.attribute_modify )
				attribute = options.attribute_modify( attribute );

			// add to array
			found.push( attribute );
		});

		// diff
		var uj = diff( found, database );

		found.sort();
		found.reverse();

		console.log(options.name);
		console.log(url);
		console.log('found', found.length);
		console.log('database', database.length);
		console.log('uj', uj.length);

		database = _.unique( database.concat( found ) );

		console.log('new database', database.length);

		// write to database
		fs.writeFileSync(json_file, JSON.stringify( database, null, '\t' ) );

		console.log('======');

		// OS X notification
		if ( uj.length )
			exec('osascript -e \'display notification "' + uj.length + ' hit" with title "' + options.name + '"\'');
		else
			exec('osascript -e \'display notification ":(" with title "' + options.name + '"\'');

		// open in browser
		for ( var i = 0; i < uj.length; i++ )
			setTimeout(open, i * 200, options.open_url + uj[i] + ( typeof options.open_url_postfix != 'undefined' ? options.open_url_postfix : '' ));

		if ( options.callback && typeof options.callback === 'function' )
			setTimeout(options.callback, 500);
	});
};
