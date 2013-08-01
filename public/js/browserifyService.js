angular.module('crowsnest').factory('browserify', function () {
  return {
    shoe: require('shoe'),
    crdt: require('crdt'),
    MuxDemux: require('mux-demux'),
    events: require('events')
  }
})