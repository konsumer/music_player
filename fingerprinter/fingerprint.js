var fingerprint=require('./lib.js'),
	glob=require('glob'),
	fs = require('fs');

fingerprint.secrets = require('./secrets.json');

var records = [];

if (process.argv.length > 3){
	glob(process.argv[2]+'/*.mp3', function(er, files){
		if (er) throw er;
		files.forEach(function(fname){
			console.log('looking up', fname);
			fingerprint(fname, process.argv[2], function(er, data){
				if (er) return console.error(er);
				records.push(data);
			});
		})
	});
}else{
	console.log('Usage: ', process.argv.slice(0,2).join(' '), 'MP3_DIR OUTFILE')
}

process.on('exit', function(){
	if (records.length>0){
		fs.writeFileSync(process.argv[3], JSON.stringify(records));
	}
});