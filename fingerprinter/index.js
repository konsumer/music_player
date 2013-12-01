var	secrets = require('./secrets.json'),
	RateLimiter = require('limiter').RateLimiter,
	lmtEco = new RateLimiter(10, 'minute'),
	Rdio = require('rdio-node').Rdio,
	rdio = new Rdio(secrets['rdio']),
	lmtRdio = new RateLimiter(5, 'second'),
	request = require('request'),
	exec = require('child_process').exec
	glob = require('glob'),
	extend = require('extend'),
	fs = require('fs');

// echonest data-buckets
var buckets = ["audio_summary", "artist_familiarity", "artist_hotttnesss", "song_hotttnesss", "song_type", "tracks", "id:rdio-US", "id:spotify-WW", "id:musicbrainz", "id:discogs"];

/**
 * Flatten {"ok":{"cool":{"i":{"like":{"it":['neat']}}}} to {'ok.cool.i.like.it.0':'neat'}
 * @param  {Object} data Unflattened object
 * @return {Object}      Hash object with flat keys
 */
JSON.flatten = function(data) {
    var result = {};
    function recurse (cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
             for(var i=0, l=cur.length; i<l; i++)
                 recurse(cur[i], prop ? prop+"."+i : ""+i);
            if (l == 0)
                result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop+"."+p : p);
            }
            if (isEmpty)
                result[prop] = {};
        }
    }
    recurse(data, "");
    return result;
};

/**
 * Unflatten {'ok.cool.i.like.it.0':'neat'} to {"ok":{"cool":{"i":{"like":{"it":['neat']}}}}
 * @param  {Object} data Hash object with flat keys
 * @return {Object}      Unflattened object
 */
JSON.unflatten = function(data) {
    "use strict";
    if (Object(data) !== data || Array.isArray(data))
        return data;
    var result = {}, cur, prop, idx, last, temp;
    for(var p in data) {
        cur = result, prop = "", last = 0;
        do {
            idx = p.indexOf(".", last);
            temp = p.substring(last, idx !== -1 ? idx : undefined);
            cur = cur[prop] || (cur[prop] = (!isNaN(parseInt(temp)) ? [] : {}));
            prop = temp;
            last = idx + 1;
        } while(idx >= 0);
        cur[prop] = data[p];
    }
    return result[""];
};

/**
 * Use local echoprint-codegen + remote song/identify to get echo info
 * @param  {String}   fname local filename
 * @param  {Function} cb    callback -> (er, filename)
 */
function analyzeEcho(fname, cb){
	exec('echoprint-codegen "' + fname + '"', function(er, sout, serr){
		if (er) return cb('local fingerprint: ' + er);
		if (serr) return cb('local fingerprint: ' + serr);
		var data = JSON.parse(sout)[0];
		if (data.error){
			return cb('local fingerprint: ' + data.error);
		}
		lmtEco.removeTokens(1, function(er, remainingRequests) {
			var record = { "code": data.code };
			if (data.metadata){
				record.metadata = data.metadata;
			}
			var r = request.post('http://developer.echonest.com/api/v4/song/identify?api_key=' + secrets['echo'].key + '&format=json', function (er, r, body) {
				if (er) return cb('remote echo: ' + er);
				var bod = JSON.parse(body);
				if (bod.response.status.code !=0){
					return cb('remote echo: ' + bod.response.status.message);
				}
				cb(null, bod.response.songs[0]);
			});
			var form = r.form();
			form.append('query', JSON.stringify(record));
			buckets.forEach(function(bucket){
				form.append('bucket', bucket);
			});
		});
	});
}

/**
 * Find all images & other data for a given track from non-echonest APIs
 * @param  {[type]} track
 * @param  {Function} cb(err, images)
 */
function getOther(track, cb){
	function getDC(){
		if (track.releases && track.releases.discogs && track.releases.discogs.length > 0){
			track.releases.discogs.forEach(function(v, i){
				request.get('http://api.discogs.com/releases/' + v, function(er, r, data){
					try{
						data = JSON.parse(data);
						data.track.images.forEach(function(img){
							if (img.type == 'primary'){
								track.images.push(img.resource_url);
							}
						});
					}catch(e){}
					if (i == track.releases.discogs.length-1){
						cb(null, track);
					}
				});
			});
		}else{
			cb(null, track);
		}
	}

	function getMb(){
		if (track.releases && track.releases.musicbrainz && track.releases.musicbrainz.length > 0){
			track.releases.musicbrainz.forEach(function(v, i){
				request.get('http://coverartarchive.org/release/' + v +'/', function(er, r, data){
					try{
						data = JSON.parse(data);
						track.images.push(data.track.images[0].image);
					}catch(e){}
					if (i == track.releases.musicbrainz.length-1){
						getDC();
					}
				});
			});
		}else{
			getDC();
		}
	}

	function getRdio(){
		if (track.releases && track.releases.rdio && track.releases.rdio.length > 0){
			lmtRdio.removeTokens(1, function(er, remainingRequests) {
				rdio.makeRequest('get', {'keys':track.releases.rdio.join(',')}, function(er, r){
					if (er || r.status != 'ok'){
						cb(er);
					}else{
						var i = 0;
						for (rid in r.result){
							try{
								track.images.push(r.result[rid].icon);
								if(r.result[rid].releaseDate){
									track.releaseDate = r.result[rid].releaseDate;
								}
							}catch(e){}
							if (i == track.releases.rdio.length-1){
								getMb();
							}

							i++;
						}
					}
				});
			});
		}else{
			getMb();
		}
	}
	
	track.images = [];
	getRdio();
}

var records = [];

if (process.argv.length > 3){
	glob(process.argv[2]+'/*.mp3', function(er, files){
		if (er) throw er;
		files.forEach(function(fname){
			console.log('looking up', fname);
			analyzeEcho(fname, function(er, song){
				if (er) throw er;
				var track = {
					"id": song.id,
					"file": fname.replace(process.argv[2] + '/','').replace(process.argv[2],''),
					"title": song.title,
					"artist.name": song.artist_name,
					"artist.id": song.artist_id,
					"artist.familiarity": song.artist_familiarity,
					"artist.hotttnesss": song.artist_hotttnesss,
					"hotness": song.song_hotttnesss,
					"type": song.song_type,
					"tracks.echo":[],
					"tracks.rdio":[],
					"tracks.spotify":[],
					"tracks.musicbrainz":[],
					"tracks.discogs":[],
					"releases.rdio":[],
					"releases.spotify":[],
					"releases.musicbrainz":[],
					"releases.discogs":[]
				};
				
				if (song.audio_summary){
					track = extend(track, JSON.flatten({audio: JSON.flatten(song.audio_summary)}));
				}
				if (song.metadata){
					track = extend(track, JSON.flatten({meta: JSON.flatten(song.metadata)}));
				}

				if (song.tracks){
					song.tracks.forEach(function(t){
						track['tracks.echo'].push(t.id);
						if (t.catalog){
							var key = t.catalog.replace('-WW','').replace('-US','');
							if (t.foreign_id){
								track['tracks.' + key].push(t.foreign_id.replace(t.catalog+':track:',''));
							}
							if (t.foreign_release_id){
								track['releases.' + key].push(t.foreign_release_id.replace(t.catalog+':release:',''));
							}
						}
					});
				}

				var s = JSON.unflatten(track);
				getOther(s, function(er, s){
					if (s.images.length > 0){
						s.image = s.images[0];
					}
					// you could save this in a regular database, at this point
					records.push(s);
					console.log('got info for', track.file)
				});
			})
		});
	});
}else{
	console.log('Usage: ', process.argv.slice(0,2).join(' '), 'MP3_DIR OUTFILE')
}

process.on('exit', function(){
	if (records.length>0){
		fs.writeFileSync(process.argv[3], JSON.stringify(records));
	}
});