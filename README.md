## Install

DNS Server that translates requests from english to estonian (mountain -> mägi)

    npm install dnsdict
    
### Run

    sudo npm start dnsdict

Dig a word

    dig mountain @localhost

Response

    mountain 60 IN TXT m"agi