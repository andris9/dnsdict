var fs = require("fs"),
	ndns = require('ndns'),
    server = ndns.createServer('udp4'),
    punycode = require("punycode"),
    Iconv  = require('iconv').Iconv,
    iconv = new Iconv('UTF-8', 'ASCII//IGNORE//TRANSLIT');

/*
 * Funktsioon laeb tekstifailist sõnaraamatu ja salvestab selle
 * muutujasse kujul {"word(en)": "translation(et)"}.
 * 
 * Sisendiks failinimi ja callback funktsioon
 */
function loadDictionary(file, callback){
	var dict = {};

	fs.readFile(file, "utf-8", function(error, text){
		
		if(error){
			return callback(error);
		}

        // lõika fail ridadeks ja käivita forEach kõikide ridade kohta
		text.split(/\r?\n/).forEach(function(line){
		    
		    // lõika rida \t kohalt pooleks - esimene pool on en, ülejäänud et
			var parts = line.split("\t"),
				en = parts.shift().toLowerCase().trim(),
				et = parts.join(" ").trim();
			
			// juhul kui nii en kui et osa olemas, salvesta muutujasse
			if(en && et){
				dict[en] = et;
			}
		});

        // järgmisel vabal hetkel käivita callback 
		process.nextTick(callback.bind(this, null, dict));
	});
}

/*
 * Funktsioon vastab DNS päringutele
 * 
 * Sisendiks sõnaraamatu objekt, DNS päringu küsimus- ja vastusobjektid
 */
function DNSServerResponse(dict, req, res){
	
	// Seab DNS vastuse päise
	res.setHeader(req.header);
    res.header.qr = 1; // Question/Response
    res.header.aa = 1; // Authorative Answer
    res.header.rd = 0; // Recursion Desired

    var question,
    	translation;

    // töötle ükshaaval saabunud küsimused (peaks küll olema vaid 1)
    for (var i = 0; i < req.q.length; i++){
        res.addQuestion(req.q[i]); // Lisa kirje küsimuste sektsiooni

        // vorminda küsimus (punycode->unicode jne)
        question = punycode.toUnicode(req.q[i].name.toLowerCase().trim());
        
        // lae sõnaraamatu objektist tõlge
        translation = dict[question] || "";

        // väljasta tulemus konsoolile
        console.log(question+" -> "+translation);

        // kui tõlge on olemas, lisa vastuskirje
        if(translation){
        	res.addRR(
        	   punycode.toASCII(question), // name 
        	   60, // TTL 
        	   "IN", // CLASS 
        	   "TXT", // TYPE 
        	   iconv.convert(translation).toString("ASCII") // response
            );
        	res.header.ancount++; // Vastuse sektsiooni kaunter
        }
    }
    
    // saada päringu vastus
    res.send();
}

/*
 * Käivitab DNS serveri
 * 
 * Sisendiks sõnaraamatu objekt
 */
function startDNSServer(dict){
    // DNS päringu puhul käivitab DNSServerResponse funktsiooni
    // ja seab selle esimeseks parameetriks dict objekti
	server.on("request", DNSServerResponse.bind(this, dict));
	// server hakkab kuulama UDP porti 53
    server.bind(53);
    console.log("Listening on UDP port 53")
}

// Skript loeb sisse sõnaraamatu ja käivitab DNS serveri
loadDictionary(__dirname + "/en_et.txt", function(error, dict){
	if(error){
		throw error;
	}
	startDNSServer(dict);
});
