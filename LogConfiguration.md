# NLog

In order to make NLog send JSON messages over UDP you need to add a target in the NLog config file. It's a built-in Network target
configured to output JSON message - please use the example below. Of course you need also to add some logging rules so messages will be 
routed to this new target.

```
<targets>
        <target name="glog" xsi:type="Network" layout='{"ts":"${ticks}", "level":"${level}", "source": "SomeApplication_1", "logname":"${logger}", "threadid":${threadid}, "pid":${processid}, "seq":${counter}, "message":"${json-encode:${message}}"}' address="udp4://127.0.0.1:10444">
        (...)
</targets>
```

# Log4Net

TODO

# Log4J

TODO

# Java Logging

TODO

# Any other

Just send an UDP message containing event JSON
