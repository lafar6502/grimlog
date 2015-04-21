# grimlog
Simple, lightweight log aggregator and web viewer

Glog-view is a simple log aggregator that collects application logs over the network and saves them in sqlite database. Collected logs 
can be browsed and searched via web gui which is also provided by the application. The tool is implemented using nodejs and has everything
that's necessary to collect and browse logs.

# Features
  * Log messages are sent to Glog-view over UDP, every message is a JSON object. Simple JSON and GELF format are supported. More transport options/formats to come (hopefully).
  * Many popular logging frameworks can be configured to send logs over UDP/GELF so no additional libraries are necessary on the application side.
  * Single process. Glog-view runs as a single nodejs application and doesn't have any dependencies on other running services. 
  * Low footprint - single nodejs application, consumes 30-130 MB of RAM, compact log file format, efficient and lightweight implementation.  
  * Simple configuration, or no configuration at all. Just install and run, the same procedure on Linux, Windows or Mac OS. 
  * Log rotation. By default Glog-view rotates the log files on a daily basis and allows you to browse all collected files.
  * Performance: sqlite database is able to store 20-50 thousand records per second so this is the theoretical maximum of what Glog-viewer can handle.
    Database performance is the key limit here.

# Status
Currently in alpha, some important parts need to be completed

# Message fields
List of fields that are handled/understood by grimlog 
* message - message text (short_message and full_message in GELF) - mandatory
* level - log level (syslog severity, same as in GELF) - optional
* ts - timestamp (num of milliseconds since epoch) - optional 
* source - log source (application name for example) - optional
* logname - log name (_logname custom field in GELF message) - optional
* pid - process ID (_pid in GELF) - optional
* threadid - thread ID (_threadid in GELF) - optional
* correlation - correlation id that joins group of messages (_correlatio in GELF) - optional

# TODO List - ideas, plans    
  * Full-text search (currently only normal sql queries are used) 
  * More transport options (ZeroMQ, TCP)
  * Event parsing/pre-processing so we can handle other message formats as well
  * Event filtering so we can decide whether events will be logged or not
  * Setup instructions for most popular logging libraries (NLog, Log4J, Log4net, ...)
  * Statistics display (histogram etc)
  * 'Global search' - parallel search in all log files at once
  * Data export
  * Configurable log views
  * Online event processing (configurable rules for handling incoming events and detecting some patterns/anomalies or deciding what to do with an event)
  * Performance metrics (e.g. forwarding some data to performance monitoring tool, time series database, rrdtool)
  * Alerts (nagios integration?)
  * User authentication - via some external auth mechanism
  * Reading logs from text files, tailing text log files and parsing events from them
  * Health check (basic website with some stats/grimlog health information)
 
  
  
