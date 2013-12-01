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

`node index.js MP3_DIR OUTPUT_FILE`