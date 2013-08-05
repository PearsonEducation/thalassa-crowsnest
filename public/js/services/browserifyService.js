angular.module('crowsnest').factory('browserify', function () {
  return {
    shoe: require('shoe'),
    reconnect: require('reconnect/shoe'),
    crdt: require('crdt'),
    MuxDemux: require('mux-demux'),
    events: require('events')
  }
})