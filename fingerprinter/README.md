# Echonest Fingerprinter

This will generate some meta-data about your MP3s.

## Configuration

Make a file called secrets.json in this directory, that looks like this:

```
{
	"echo": {
		"key": "ECHONEST KEY",
		"consumer": "ECHONEST CONSUMER KEY",
		"secret": "ECHONEST SECRET"
	},
	"rdio":{
		"consumerKey": "RDIO KEY",
		"consumerSecret": "RDIO SECRET"
	}
}
```

## Running It

`node fingerprint.js MP3_DIR OUTPUT_FILE`

## Installing

If you want to install `fingerprint-echo` in your path, type `sudo npm install -g`

## Using it, in code

```javascript

var fingerprint = require('fingerprint-echo');
fingerprint.secrets = {}; // from above

fingerprint(fname, mp3_dir, function(er, data){
	// do stuff with data
});

```