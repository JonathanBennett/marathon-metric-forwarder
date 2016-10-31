# Marathon Metrics Forwarder

The Marathon Metrics Forwarder is a lightweight service which uses the Marathon API to allow developers to expose metrics endpoints for forwarding to a collector without having to run any other sidecars or eventing out metrics. Either through Kafka or directly to a collection endpoint. This collector makes no expectation around your metrics formats but merely collects them to then be consumed off a queue.

## Setup
1. Marathon must be used to deploy applications, either containers or native MESOS containers
2. In your Marathon labels, you *must* supply the label "METRICS_ENDPOINT" for it to be registered with the metrics collection service.
3. Start the marathon metrics forwarder (preferably inside Marathon) with the environment variables and watch the metrics roll in.

## Configuration

### Marathon label configuration

`metrics_endpoint` - Metrics endpoint (excluding domain). Ex: "/metrics" or "/metrics.json" **Required**

`metrics_endpoint_port` - Allows to override which port the metrics forwarder will request metrics on. Defaults to port0 in the marathon config. **Optional**

`metrics_frequency` - Metrics collection frequency (in seconds). Defaults to 5. **Optional**

### Collector configuration

`MARATHON_URL` - Marathon URL (for service discovery). Defaults to 'http://localhost:8080'

`KAFKA_TOPIC` - Kafka Topic name. Defaults to 'metrics_topic'.

`ZOOKEEPER_QUORUM` - Comma separated list of Zookeeper hosts (optionally including ZNODE path). Defaults to 'localhost:2181'.

`CLEARUP_TIMEOUT` - How long before a failed check is ejected from memory (in seconds). Defaults to 60.

`CLEARUP_FREQUENCY` - How frequently to check for failed checks for clearup (in seconds). Defaults to 60.

`REFRESH_FREQUENCY` - How frequently to check for new tasks (in seconds). Defaults to 60.

## API

GET /v1/timers

Gets a list of available scrapers (timers)

## Enhancements
* Listen to the Marathon event bus to know when new instances are started and stopped
* Refactor Kafka element to be a plugin to allow multiple backends for receiving metrics
* Create plugin interface to take certain metrics endpoints and allow for parsing pre-sending (such as Prometheus to JSON, JSON to Line Protocol etc.)
* Support basic auth for Marathon URL
* Support publicly valid HTTPS for services (trivial)
