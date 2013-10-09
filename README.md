Thalassa Crowsnest
==================

Crowsnest is a realtime dashboard for [Thalassa](https://github.com/PearsonEducation/thalassa).


# Installation

    npm install thalassa-crowsnest

# Running

The easiest way to run Crowsnest at this point is with the bin script from the command line. Crowsnest is exposed as a module and can be used as such in your own application but you should have [a close look](https://github.com/PearsonEducation/thalassa-crowsnest/blob/master/bin/server.js#L65) at how the SockJS connection is configured.

    ./node_modules/.bin/thalassa-crowsnest


## Options

	./node_modules/.bin/thalassa-crowsnest --h
	Options:
	  --host             host to bind to              [default: "0.0.0.0"]
	  --port             port to bind to              [default: 8080]
	  --thalassaHost     host of the Thalassa server  [default: "127.0.0.1"]
	  --thalassaPort     port of the Thalassa server  [default: 5001]
	  --thalassaApiPort  port of the Thalassa server  [default: 9000]
	  --dbPath           filesystem path for leveldb  [default: "./node_modules/thalassa-crowsnest/bin/db"]
	  --debug            enabled debug logging


# Known Limitations and Roadmap

Thalassa currently doesn't implement any type of authentication or authorization and at this point expects to be running on a trusted private network. This will be addressed in the future. Ultimately auth should be extensible and customizable. Suggestions and pull requests welcome!

# License

Licensed under Apache 2.0. See [LICENSE](https://github.com/PearsonEducation/thalassa-crowsnest/blob/master/LICENSE) file.
