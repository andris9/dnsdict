var fs = require("fs"),
	ndns = require('ndns'),
    server = ndns.createServer('udp4'),
    punycode = require("punycode");

function loadDictionary(file, callback){
	var dict = {};

	fs.readFile("en_et.txt", "utf-8", function(error, text){
		
		if(error){
			return callback(error);
		}

		text.split(/\r?\n/).forEach(function(line){
			var parts = line.split("\t"),
				en = parts.shift().toLowerCase().trim(),
				et = parts.join(" ").trim();
			
			if(en && et){
				dict[en] = et;
			}
		});

		process.nextTick(callback.bind(this, null, dict));
	});
}

function DNSServerResponse(req, res){
	
	res.setHeader(req.header);

    res.header.qr = 1;
    res.header.aa = 1;

    var question,
    	translation;

    for (var i = 0; i < req.q.length; i++){
        res.addQuestion(req.q[i]);

        question = punycode.toUnicode(req.q[i].name.toLowerCase().trim());
        translation = dict[question];

        if(translation){
        	res.addRR(punycode.toASCII(question), 60, "IN", "TXT", punycode.toASCII(translation));
        	res.header.ancount++;
        }
    }

    res.send();
}

function startDNSServer(dict){
	server.on("request", DNSServerResponse);
    server.bind(53);
    console.log("Listening on UDP port 53")
}

loadDictionary(__dirname + "/et_en.txt", function(error, dict){
	if(error){
		throw error;
	}
	startDNSServer(dict);
});


